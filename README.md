Parking App - Code Challege

## Getting Started

First, install dependencies and run the development server:

```bash
yarn add
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Routes

### Park

Description - Responsible for finding a parking slot for every vehicle entered the parking complex and park the vehicle.

Endpont - `POST` `/park`

Description - Responsible for finding a parking slot for every vehicle entered the parking complex

Body parameters -

```
entryPoint String,
vehicleId Number,
entyTime Date
```

### Unpark

Description - Unpark the vehicle and responsible for computing the amount charged.

Endpont - `GET` `/unpark`

Query Parameter -

```
id Number
exitTime Date
vehicleId Number
```
