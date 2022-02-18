import { NextApiRequest, NextApiResponse } from "next";
import { ParkingSlot } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.status(405).send({ message: "Only GET requests allowed" });
    return;
  }

  try {
    // Get all parking slots
    const parkingSlots: ParkingSlot[] = await prisma.parkingSlot.findMany();
    res.status(200).json({
      status: "OK",
      message: "List of parking slots",
      data: parkingSlots,
    });
  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
}
