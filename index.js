const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv')

//load environment variable from env file --
dotenv.config();

const app = express();
const port = process.env.PORT || 5000 ;

//middle ware --
app.use(cors());
app.use(express.json());

app.get('/', (req, res) =>{
    res.send("sports server is cooking")
})

app.listen(port, ()=>{
    console.log(`sports server is running on port: ${port}`)
})