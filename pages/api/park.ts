import { NextApiRequest, NextApiResponse } from "next";
import { ParkingSlot, Vehicle } from "@prisma/client";
import Joi from "joi";
import { prisma } from "../../lib/prisma";

const schema = Joi.object({
  entryPoint: Joi.number().integer().min(0).max(3),
  vehicleId: Joi.number().integer().min(0),
  entryTime: Joi.date(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.status(405).send({ message: "Only POST requests allowed" });
    return;
  }

  try {
    await schema.validateAsync(req.body);

    const { entryPoint, vehicleId, entryTime } = req.body;

    // check for available parking slot
    const parkingSlots: ParkingSlot[] = await prisma.parkingSlot.findMany({
      where: { available: true },
    });

    // get vehicle data
    const vehicle: Vehicle | null = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        transaction: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    if (!vehicle) {
      throw new Error("no vehicle found");
    }

    const availableSlots = parkingSlots.filter((ps) => {
      return ps.size >= vehicle.size;
    });

    if (availableSlots.length == 0)
      throw new Error("No available parking slot.");

    // Get all the distances in in the entry point
    let distances: number[] = [];
    availableSlots.map((ps) => {
      distances.push(ps.distance[entryPoint]);
    });

    // find mininmun distance and return the the parking slot
    const minDistance = Math.min(...distances);
    const minIndex = distances.findIndex((d) => d == minDistance);
    const parkingSlot = availableSlots[minIndex];

    // create parking transaction
    await prisma.transaction.create({
      data: {
        vehicleSize: vehicle.size,
        entryPoint: entryPoint,
        paid: false,
        parkingSlotId: parkingSlot.id,
        vehicleId,
        entryTime,
      },
    });

    // update parking slot availability
    await prisma.parkingSlot.update({
      where: { id: parkingSlot.id },
      data: {
        available: false,
        vehicleId: vehicle.id,
      },
    });

    res
      .status(200)
      .json({ status: "OK", message: "Successfully park a vehicle." });
  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
}
