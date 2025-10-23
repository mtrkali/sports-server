const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

//load environment variable from env file --
dotenv.config();

const app = express();
const port = process.env.PORT || 5000 ;

//middle ware --
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rwjljqx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    //await client.connect();



    
    const db = client.db('sportsClub')
    const bookingCollection = db.collection('booking');
    const usersCollection = db.collection('users');
    const announcementsCollection = db.collection('announcements')
    const couponsCollection = db.collection('coupons')

    // booking api ---- post + get + patch + put
    app.post('/booking', async(req, res) =>{
        const newBooking = req.body;
        const result = await bookingCollection.insertOne(newBooking)
        res.send(result);
    })

    app.get('/booking', async(req, res)=>{
      const {email, status} = req.query
      let query = {};
      if(email)query.requestBy = email;
      if(status)query.status = status;
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    })

    app.get('/booking/approved', async(req, res) =>{
      const {email, status} = req.query
      let query = {}
      if(email)query.requestBy = email;
      if(status)query.status = status;
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    })

    app.get('/booking/confirmed', async(req, res)=>{
      const {email, status} = req.query;
      let query = {};
      if(email)query.requestBy = email;
      if(status)query.status = status;
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    })

    app.delete('/booking/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    })

    app.get('/bookings/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await bookingCollection.findOne(query);
      res.send(result);
    })

    app.patch('/bookings/:id', async(req, res) =>{
      const id = req.params.id;
      const paidBooking = req.body;
      const result = await bookingCollection.updateOne({_id: new ObjectId(id)},{$set: paidBooking})
      res.send(result);
    })

    //admin - API(booking)
    app.get('/booking/pending', async(req, res) =>{
      const status = req.query.status;
      const result = await bookingCollection.find({status: status}).toArray();
      res.send(result);
    })

    app.patch('/booking/approve/:id', async(req, res) =>{
      const id = req.params.id;
      const approveBooking = req.body
      const result = await bookingCollection.updateOne({_id: new ObjectId(id)},{$set: approveBooking})
      res.send(result);
    })

    //userscollection post + get + patch + put 

    //user + post   
    app.post('/users', async(req, res) =>{
      const newUser = req.body;
      const result = await usersCollection.insertOne(newUser);
      res.send(result);
    })

               //admin
    app.get('/users/member', async(req, res) =>{
      const result = await usersCollection.find({role: 'member'}).toArray();
      res.send(result);
    })

    //admin
    app.patch('/users/rejectmember/:email', async(req, res)=>{
      const email = req.params.email;
      const updatedDoc = req.body;
      const result = await usersCollection.updateOne({email: email},{$set:updatedDoc})
      res.send(result);
    })

    app.post ('/users/google', async(req, res)=>{
      const userInfo = req.body;
      const result = await usersCollection.updateOne(
        {email: userInfo.email},
        {$set:{last_signIn: userInfo.last_signIn,}, $setOnInsert:{createdAt:userInfo.createdAt, role: userInfo.role, name: userInfo.name}},
        {upsert: true}
      )
      res.send(result);
    })

    //user + get 
    app.get('/users', async(req, res)=>{
      const email = req.query.email
      let query = {}
      if(email){
        query = {email: email}
      }
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    })

    app.patch('/users/:email', async(req, res)=>{
      const email = req.params.email;
      const upatedDoc = req.body;
      const result = await usersCollection.updateOne({email: email},{$set: upatedDoc})
      res.send(result);
    })


    //announcements api 

    //announcements + get
    app.get('/announcements', async(req,res)=>{
      const result = await announcementsCollection.find().toArray();
      res.send(result);
    })






    // coupons collection --
    //coupons + post
    app.post('/coupons', async(req, res)=>{
      const newCoupon = req.body;
      const result = await couponsCollection.insertOne(newCoupon);
      res.send(result);
    })
    //coupons +get
    app.get('/coupons', async(req, res) =>{
      const result = await couponsCollection.find().toArray();
      res.send(result)
    })

    //coupons + delete
    app.delete('/coupons/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await couponsCollection.deleteOne(query);
      res.send(result)
    })

    //coupons + patch
    app.patch('/coupons/:id', async(req, res) =>{
      const id = req.params.id;
      const updatedData = req.body;
      const result = await couponsCollection.updateOne({_id: new ObjectId(id)},{$set:updatedData})
      res.send(result);
    })

    



    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);





app.get('/', (req, res) =>{
    res.send("sports server is cooking")
})

app.listen(port, ()=>{
    console.log(`sports server is running on port: ${port}`)
})