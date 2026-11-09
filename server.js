const express = require("express");

const app = express();
const port = 3000;
const drugs = [
  {
    drugId: "DRUG-01",
    name: "Oxytetracycline",
    category: "Tetracycline",
    standardWithdrawalDays: 7,
    mrlLimit: "100 ppb",
    targetProducts: ["Milk", "Meat"],
    demoOnly: true
  },
  {
    drugId: "DRUG-02",
    name: "Amoxicillin",
    category: "Beta-lactam",
    standardWithdrawalDays: 3,
    mrlLimit: "4 ppb",
    targetProducts: ["Milk"],
    demoOnly: true
  },
  {
    drugId: "DRUG-03",
    name: "Enrofloxacin",
    category: "Fluoroquinolone",
    standardWithdrawalDays: 14,
    mrlLimit: "100 ppb",
    targetProducts: ["Poultry", "Meat"],
    demoOnly: true
  },
  {
    drugId: "DRUG-04",
    name: "Gentamicin",
    category: "Aminoglycoside",
    standardWithdrawalDays: 40,
    mrlLimit: "100 ppb",
    targetProducts: ["Meat"],
    demoOnly: true
  }
];

app.get("/api/health", (request, response) => {
  response.json({ status: "ok" });
});

app.get("/api/drugs", (request, response) => {
  response.json(drugs);
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
