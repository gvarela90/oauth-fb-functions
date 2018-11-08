import * as controllers from "./controllers";

module.exports = app => {
  app.post("/login", controllers.login);

  app.get("/getSetUp2fa", controllers.getSetUp2fa);

  app.post("/postSetUp2fa", controllers.postSetUp2fa);

  app.delete("/deleteSetUp2fa", controllers.deleteSetUp2fa);

  app.get("*", (req, res) => {
    res.status(404).json({ message: "Endpoint not found" });
  });
};
