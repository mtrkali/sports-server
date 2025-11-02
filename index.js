const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");


//load environment variable from env file --
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

//middle ware --
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://simple-firebase-auth-c3104.web.app",
    ],
    credentials: true,
  })
);
app.use(express.json());

const decodedKey = Buffer.from(
  process.env.FB_SERVICE_KEY.replace(/-/g, "+").replace(/_/g, "/"),
  "base64"
).toString("utf8");
const serviceAccount = JSON.parse(decodedKey);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rwjljqx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    //await client.connect();

    const db = client.db("sportsClub");
    const bookingCollection = db.collection("booking");
    const usersCollection = db.collection("users");
    const announcementsCollection = db.collection("announcements");
    const couponsCollection = db.collection("coupons");
    const courtsCollection = db.collection("courts");

    //custom middleware --
    const verifyFBToken = async (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).send({ message: "unAuthorized user" });
      }
      const token = authHeader.split(" ")[1];
      if (!token) {
        return res.status(401).send({ message: "unauthorized user" });
      }
      //verify token
      try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.decoded = decoded;
        next();
      } catch (error) {
        return res.status(403).send({ message: "forbidden access" });
      }
    };

    //verify admin --
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const user = await usersCollection.findOne({ email: email });
      if (!user || user.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    //verify role
    app.get("/users/:email/role", async (req, res) => {
      const email = req.params.email;
      const find = { email: email };
      const result = await usersCollection.findOne(find);
      res.send({ role: result.role || "user" });
    });

    //main agregate api
    app.get("/admin/overview", verifyFBToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection
        .aggregate([
          {
            $facet: {
              totalUsers: [{ $count: "count" }],
              totalMembers: [
                { $match: { role: "member" } },
                { $count: "count" },
              ],

              adminInfo: [
                { $match: { role: "admin" } },
                { $project: { _id: 0, name: 1, email: 1, image: 1 } },
              ],
            },
          },
        ])
        .toArray();

      const courtsCount = await courtsCollection.countDocuments();

      const data = result[0];
      res.send({
        adminInfo: data.adminInfo[0] || {},
        stats: {
          totalCourts: courtsCount,
          totalUsers: data.totalUsers[0]?.count || 0,
          totalMembers: data.totalMembers[0]?.count || 0,
        },
      });
    });

    // booking api ---- post + get + patch + put
    app.post("/booking", async (req, res) => {
      const newBooking = req.body;
      const result = await bookingCollection.insertOne(newBooking);
      res.send(result);
    });

    app.get("/booking",verifyFBToken, async (req, res) => {
      const { email, status } = req.query;
      if (req.decoded.email !== email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      let query = {};
      if (email) query.requestBy = email;
      if (status) query.status = status;
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/booking/approved",verifyFBToken , async (req, res) => {
      const { email, status } = req.query;
      let query = {};
      if (email) query.requestBy = email;
      if (status) query.status = status;
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/booking/confirmed",verifyFBToken, async (req, res) => {
      const { email, status } = req.query;
      let query = {};
      if (email) query.requestBy = email;
      if (status) query.status = status;
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.findOne(query);
      res.send(result);
    });

    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const paidBooking = req.body;
      const result = await bookingCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: paidBooking }
      );
      res.send(result);
    });

    //admin - API(booking)
    app.get(
      "/booking/pending",
      verifyFBToken,
      async (req, res) => {
        const status = req.query.status;
        const result = await bookingCollection
          .find({ status: status })
          .toArray();
        res.send(result);
      }
    );

    app.patch(
      "/booking/approve/:id",
      verifyFBToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const approveBooking = req.body;
        const result = await bookingCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: approveBooking }
        );
        res.send(result);
      }
    );

    //userscollection post + get + patch + put

    //user + post
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const result = await usersCollection.insertOne(newUser);
      res.send(result);
    });

    //admin
    app.get("/users/member", verifyFBToken, verifyAdmin, async (req, res) => {
      const search = req.query.search || "";
      const query = {
        role: "member",
        name: { $regex: search, $options: "i" },
      };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    //admin
    app.patch(
      "/users/rejectmember/:email",
      verifyFBToken,
      verifyAdmin,
      async (req, res) => {
        const email = req.params.email;
        const { role, removeMemberAt } = req.body;

        const updatedDoc = { $set: { role } };
        if (removeMemberAt) {
          updatedDoc.$unset = { memberAt: "" };
        }
        const result = await usersCollection.updateOne(
          { email: email },
          updatedDoc
        );
        res.send(result);
      }
    );

    app.post("/users/google", async (req, res) => {
      const userInfo = req.body;
      const result = await usersCollection.updateOne(
        { email: userInfo.email },
        {
          $set: { last_signIn: userInfo.last_signIn },
          $setOnInsert: {
            createdAt: userInfo.createdAt,
            role: userInfo.role,
            name: userInfo.name,
          },
        },
        { upsert: true }
      );
      res.send(result);
    });

    //user + get  admin
    app.get("/users", verifyFBToken, async (req, res) => {
      const { email, name } = req.query;
      let query = {};
      if (email) {
        query = { email: email };
      }
      if (name) {
        query = { name: { $regex: name, $options: "i" } };
      }
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/users/:id", verifyFBToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.patch("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email: email });
      if (user.role === "user") {
        const upatedDoc = req.body;
        const result = await usersCollection.updateOne(
          { email: email },
          { $set: upatedDoc }
        );
        res.send(result);
      }
      res.end();
    });

    //announcements api

    //announcements + get //admin
    app.get("/announcements", async (req, res) => {
      const result = await announcementsCollection.find().toArray();
      res.send(result);
    });

    app.patch(
      "/announcements/:id",
      verifyFBToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const updatedDoc = req.body;
        const result = await announcementsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedDoc }
        );
        res.send(result);
      }
    );

    app.delete(
      "/announcements/:id",
      verifyFBToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const result = await announcementsCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      }
    );

    app.post("/announcements", verifyFBToken, verifyAdmin, async (req, res) => {
      const newData = req.body;
      const result = await announcementsCollection.insertOne(newData);
      res.send(result);
    });

    // coupons collection --
    //coupons + post
    app.post("/coupons", verifyFBToken, verifyAdmin, async (req, res) => {
      const newCoupon = req.body;
      const result = await couponsCollection.insertOne(newCoupon);
      res.send(result);
    });
    //coupons +get
    app.get("/coupons", async (req, res) => {
      const result = await couponsCollection.find().toArray();
      res.send(result);
    });

    //coupons + delete
    app.delete("/coupons/:id", verifyFBToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await couponsCollection.deleteOne(query);
      res.send(result);
    });

    //coupons + patch
    app.patch("/coupons/:id", verifyFBToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      const result = await couponsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );
      res.send(result);
    });

    //couts collection data --Admin
    app.post("/courts", verifyFBToken, verifyAdmin, async (req, res) => {
      const newCourt = req.body;
      const result = await courtsCollection.insertOne(newCourt);
      res.send(result);
    });

    app.get("/courts", async (req, res) => {
      const result = await courtsCollection.find().toArray();
      res.send(result);
    });

    app.get("/courts/:id", async (req, res) => {
      const id = req.params.id;
      const result = await courtsCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.delete("/courts/:id", verifyFBToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await courtsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    app.patch("/courts/:id", verifyFBToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const updatedDoc = req.body;
      const result = await courtsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedDoc }
      );
      res.send(result);
    });

    app.get(
      "/booking/manageConfirmedBooings",
      verifyFBToken,
      verifyAdmin,
      async (req, res) => {
        const { query } = req.query;

        const filter = {
          payment: "paid",
          status: "confirmed",
          $or: [
            { courtName: { $regex: query, $options: "i" } },
            { bookingId: { $regex: query, $options: "i" } },
            { requestBy: { $regex: query, $options: "i" } },
          ],
        };
        const result = await bookingCollection.find(filter).toArray();
        res.send(result);
      }
    );

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("sports server is cooking");
});

app.listen(port, () => {
  console.log(`sports server is running on port: ${port}`);
});
