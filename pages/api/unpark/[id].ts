import { NextApiRequest, NextApiResponse } from "next";
import { ParkingSlot, Transaction, Vehicle } from "@prisma/client";
import Joi, { number } from "joi";
import { DateTime, Duration } from "luxon";
import { prisma } from "../../../lib/prisma";

const schema = Joi.object({
  id: Joi.number().integer().min(1),
  exitTime: Joi.date(),
  vehicleId: Joi.number().integer().min(1),
});

interface Payment {
  flatRate: number;
  hourRate: number;
  dayRate: number;
  amount: number;
  excessHourAmount: number;
  excessDayAmount: number;
  previousPayment: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await schema.validateAsync(req.query);

    const id: number = Number(req.query.id);
    const vehicleId: number = Number(req.query.vehicleId);

    const exitTime = DateTime.fromJSDate(
      new Date(req.query.exitTime as string),
      {
        zone: "utc",
      }
    ).toLocal();

    const parkingSlot = await prisma.parkingSlot.findUnique({
      where: { id },
      include: {
        transaction: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    if (!parkingSlot) throw new Error("Parking slot not found");
    if (parkingSlot.available) throw new Error("Parking slot cannot be unpark");
    if (!parkingSlot.transaction)
      throw new Error("Parking slot cannot be unpark");

    const { transaction } = parkingSlot;

    // check if the vehicle previous transaction less than an hour
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        transaction: {
          orderBy: {
            createdAt: "desc",
          },
          take: 2,
        },
      },
    });

    if (!vehicle) {
      throw new Error("no vehicle found");
    }

    const vehicleCurrTranc: Transaction = vehicle?.transaction[0];
    const vehiclePrevTranc: Transaction = vehicle?.transaction[1];

    // compute price to pay
    const payment: Payment = computePayment(
      parkingSlot,
      exitTime,
      vehiclePrevTranc,
      vehicleCurrTranc
    );
    const {
      flatRate,
      hourRate,
      dayRate,
      amount,
      excessHourAmount,
      excessDayAmount,
      previousPayment,
    }: Payment = payment;

    // update parking slot availability
    await prisma.transaction.update({
      where: { id: transaction[0].id },
      data: {
        exitTime: exitTime.toISO(),
        flatRate,
        hourRate,
        dayRate,
        amount,
        paid: true,
        vehicleId,
      },
    });

    // update parking slot availability
    await prisma.parkingSlot.update({
      where: { id: parkingSlot.id },
      data: {
        available: true,
        vehicleId: null,
      },
    });

    res.status(200).json({
      status: "OK",
      message: "Total amount charged",
      payment: {
        excessHourAmount,
        excessDayAmount,
        previousPayment,
        amount,
      },
    });
  } catch (error: any) {
    console.log(error);
    res.status(404).json({ message: error.message });
  }
}

const computePayment = (
  parkingSlot: ParkingSlot,
  exitTime: DateTime,
  vehiclePrevTransaction: Transaction,
  vehicleCurrTransaction: Transaction
): Payment => {
  // rate are hourly
  const flatRate: number = 40;
  const dayRate: number = 5000;
  const hrMilliSec: number = 3600000;
  let hourRate: number = 0;
  let amount: number = 0;
  let previousExitTime: DateTime;
  let previousEntryTime: DateTime;
  let isReturnee: boolean = false;
  let entryTime: Date | DateTime;

  if (!vehicleCurrTransaction.entryTime) {
    throw new Error("No entry time");
  }

  const currentEntrytime = DateTime.fromJSDate(
    vehicleCurrTransaction.entryTime,
    {
      zone: "utc",
    }
  ).toLocal();

  // check if the vehicle has previous checkout
  if (
    vehiclePrevTransaction &&
    vehiclePrevTransaction.entryTime &&
    vehiclePrevTransaction.exitTime
  ) {
    previousEntryTime = DateTime.fromJSDate(vehiclePrevTransaction.entryTime, {
      zone: "utc",
    }).toLocal();

    previousExitTime = DateTime.fromJSDate(vehiclePrevTransaction.exitTime, {
      zone: "utc",
    }).toLocal();

    isReturnee =
      Math.abs(
        previousExitTime.diff(currentEntrytime, "hours").valueOf() / hrMilliSec
      ) <= 1;

    entryTime = isReturnee ? previousEntryTime : currentEntrytime;
  } else {
    entryTime = currentEntrytime;
  }

  switch (parkingSlot.size) {
    case 0:
      hourRate = 20;
      break;
    case 1:
      hourRate = 60;
      break;
    case 2:
      hourRate = 100;
  }

  const previousPayment: number = isReturnee
    ? vehiclePrevTransaction.amount || 0
    : 0;

  // total consume hours
  const hoursConsume: number =
    exitTime.diff(entryTime, "hours").valueOf() / hrMilliSec;

  // check time difference
  if (hoursConsume < 0) {
    throw new Error("Exit time cannot be less than Enty time");
  }

  // get excess hours and days
  const excessHours =
    hoursConsume < 24
      ? Math.round(hoursConsume <= 3 ? 0 : hoursConsume - 3)
      : Math.round(hoursConsume % 24);
  const excessDays = Math.floor(
    exitTime.diff(entryTime, "days").valueOf() / (hrMilliSec * 24)
  );

  // add all rates
  amount =
    flatRate + excessHours * hourRate + excessDays * dayRate - previousPayment;

  amount = amount < 0 ? 0 : amount;

  return {
    flatRate,
    hourRate,
    dayRate,
    excessHourAmount: excessHours * hourRate,
    excessDayAmount: excessDays * dayRate,
    previousPayment: previousPayment,
    amount,
  };
};
