import { DateTime } from "luxon";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useState } from "react";
import { prisma } from "../lib/prisma";

interface FormData {
  entryPoint: number;
  vehicleId: number | null;
  entryTime: Date;
}

const Home = (props: any) => {
  const { parkingSlot, vehicles } = props;
  const [form, setForm] = useState<FormData>({
    entryPoint: 0,
    vehicleId: null,
    entryTime: new Date(),
  });

  const [exitTime, setExitTime] = useState(Date);
  const router = useRouter();

  const refreshData = () => {
    router.replace(router.asPath);
  };

  async function park(data: FormData) {
    console.log("data", data);
    try {
      const response = await fetch("http://localhost:3000/api/park", {
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (response.ok) {
        const payload: Record<string, any> = await response.json();
        alert(payload.message);
        refreshData();
      } else {
        const payload: Record<string, any> = await response.json();
        alert(payload.message);
      }
    } catch (error) {
      console.log(error);
      alert(error);
    }
  }

  async function unpark(id: string, vehicleId: string) {
    try {
      const response = await fetch(
        `http://localhost:3000/api/unpark/${id}?exitTime=${exitTime}&vehicleId=${vehicleId}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
          method: "GET",
        }
      );

      if (response.ok) {
        const payload: Record<string, any> = await response.json();
        alert(`${payload.message}: ${payload.payment.amount} Pesos`);
        refreshData();
      } else {
        const payload: Record<string, any> = await response.json();
        alert(payload.message);
      }
    } catch (error) {
      console.log(error);
    }
  }

  const handleSubmit = async (data: FormData) => {
    try {
      park(data);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div>
      <h1 className="font-bold text-2xl p-4">XYZ Parking App</h1>
      <div className="grid grid-cols-3 gap-1">
        <div className="col-span-1">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(form);
            }}
            className="flex flex-col items-stretch p-4 m-4 border-solid border-2 border-blue-500 rounded-lg"
          >
            <label htmlFor="entryPoint" className="font-bold">
              Choose a Entrance Point:
            </label>
            <fieldset id="entryPoint">
              <input
                type="radio"
                name="entryPoint"
                value={0}
                className="mr-4"
                onChange={(e) =>
                  setForm({ ...form, entryPoint: parseInt(e.target.value) })
                }
              />
              <label>Entrance A</label>
              <br />
              <input
                type="radio"
                name="entryPoint"
                value={1}
                className="mr-4"
                onChange={(e) =>
                  setForm({ ...form, entryPoint: parseInt(e.target.value) })
                }
              />
              <label>Entrance B</label>
              <br />
              <input
                type="radio"
                name="entryPoint"
                value={2}
                className="mr-4"
                onChange={(e) =>
                  setForm({ ...form, entryPoint: parseInt(e.target.value) })
                }
              />
              <label>Entrance C</label>
              <br />
            </fieldset>
            <label htmlFor="entryPoint" className="font-bold">
              Vehicle ID:
            </label>
            <input
              type="number"
              name="vehicleId"
              className="mr-2 border border-gray-600 p-2"
              onChange={(e) =>
                setForm({ ...form, vehicleId: parseInt(e.target.value) })
              }
            />

            <label htmlFor="entryPoint" className="font-bold">
              Enty Time:
            </label>
            <input
              type="datetime-local"
              name="entryTime"
              className="mr-2 border border-gray-600 p-2"
              onChange={(e) =>
                setForm({ ...form, entryTime: new Date(e.target.value) })
              }
            />

            <button
              type="submit"
              className="bg-blue-500 text-white rounded font-bold p-2 mt-3"
            >
              Find a Parking Slot
            </button>
          </form>
          <h1 className="font-bold ml-4 mt-8">Vehicles</h1>
          <ul>
            {vehicles
              .map((v: Record<string, any>) => (
                <li
                  key={v.id}
                  className="border border-gray-600 p-2 min-w-[75%] max-w-min ml-4"
                >
                  <div className="flex justify-between">
                    <div className="flex-1">
                      <h2>VEHICLE ID: {v.id}</h2>
                      <h2>SIZE: {v.sizeName}</h2>
                    </div>
                  </div>
                </li>
              ))
              .sort()}
          </ul>
        </div>

        <div className="col-span-2">
          <h1 className="font-bold ml-4">Parking Slots</h1>
          <ul>
            {parkingSlot
              .map((ps: Record<string, any>) => (
                <li
                  key={ps.id}
                  className="border border-gray-600 p-2 min-w-[75%] max-w-min ml-4"
                >
                  <div className="flex justify-between">
                    <div className="flex-1">
                      <h2>PARKING NO.: {ps.id}</h2>
                      <h2>SIZE: {ps.sizeName}</h2>
                      <h2>DISTANCE: {JSON.stringify(ps.distance)}</h2>
                      <h2>AVAILABLE: {ps.available.toString()}</h2>
                      <h2>
                        VEHICLE:{" "}
                        {ps.transaction[0] &&
                        ps.transaction[0].vehicleId &&
                        !ps.available
                          ? ps.transaction[0].vehicleId
                          : "N/A"}
                      </h2>
                    </div>
                    {ps.available ? null : (
                      <div>
                        <input
                          value={exitTime}
                          type="datetime-local"
                          id="exitTime"
                          name="exitTime"
                          className="mr-2 border border-gray-600 p-2"
                          onChange={(e) => setExitTime(e.target.value)}
                        ></input>
                        <button
                          onClick={() =>
                            unpark(ps.id, ps.transaction[0].vehicleId)
                          }
                          className="bg-blue-500 mr-3 px-3 text-white rounded p-2"
                          disabled={ps.available}
                        >
                          Unpark
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))
              .sort()}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Home;

export const getServerSideProps: GetServerSideProps = async () => {
  const parkingSlot = await prisma.parkingSlot.findMany({
    select: {
      id: true,
      size: true,
      distance: true,
      available: true,
      sizeName: true,
      transaction: {
        select: {
          vehicleId: true,
        },
      },
    },
  });

  const vehicles = await prisma.vehicle.findMany({
    select: {
      id: true,
      sizeName: true,
    },
  });

  return {
    props: {
      parkingSlot,
      vehicles,
    },
  };
};
