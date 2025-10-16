const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv')
const { MongoClient, ServerApiVersion } = require('mongodb');

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
    

    // booking api ---- post + get + patch + put
    app.post('/booking', async(req, res) =>{
        const newBooking = req.body;
        const result = await bookingCollection.insertOne(newBooking)
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