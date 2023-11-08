const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
  origin: [
    'http://localhost:5173'
  ],
  credentials: true
}));
app.use(express.json());

console.log(process.env.DB_PASS)


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cj9n1qe.mongodb.net/?retryWrites=true&w=majority`;

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
    await client.connect();

    const jobsCollection = client.db('jobFlowDB').collection('jobs');
    const bidsCollection = client.db('jobFlowDB').collection('bids');

    // Jobs
    app.get('/jobs', async (req, res) => {
      console.log(req.query.email);
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await jobsCollection.find(query).toArray();
      res.send(result);
    })

    app.get('/jobs/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await jobsCollection.findOne(query);
      res.send(result);
    })

    app.get('/jobs', async (req, res) => {
      const cursor = jobsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.post('/jobs', async (req, res) => {
      const newJob = req.body;
      console.log(newJob);
      const result = await jobsCollection.insertOne(newJob);
      res.send(result);
    })



    app.put('/jobs/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updatedJob = req.body;

      const job = {
        $set: {
          title: updatedJob.title,
          deadline: updatedJob.deadline,
          category: updatedJob.category,
          minPrice: updatedJob.minPrice,
          maxPrice: updatedJob.maxPrice,
          descrpition: updatedJob.descrpition
        }
      }
      const result = await jobsCollection.updateOne(filter, job, options);
      res.send(result);
    })

    app.delete('/jobs/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.deleteOne(query);
      res.send(result);
    })

    // auth related api 
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      console.log('user for token', user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})

      res.send({token});
    })

    //  Bids

    app.get('/bids', async (req, res) => {
      console.log(req.query.userEmail);
      let query ={};
      let result = null;
      if (req.query?.userEmail) {
       query = { userEmail: req.query.userEmail }
       result = await bidsCollection.find(query).sort({'_id' :1}).toArray();
      }
      if (req.query?.ownerEmail) {
        query = { ownerEmail: req.query.ownerEmail }
        result = await bidsCollection.find(query).sort({'_id' :1}).toArray();
       }

      else{
        result = await bidsCollection.find(query).sort({'status' :1}).toArray();
      }
       
      
      res.send(result);
    })
  

   


  

        app.patch('/bids/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedBid = req.body;
            console.log(updatedBid);
            const updateDoc = {
                $set: {
                    status: updatedBid.status

                },
            };
            const result = await bidsCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

   

   

    app.post('/bids', async (req, res) => {
      const newBid = req.body;
      console.log(newBid);
      const result = await bidsCollection.insertOne(newBid);
      res.send(result);
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/', (req, res) => {
  res.send('job flow is running')
})

app.listen(port, () => {
  console.log(`Job Flow Server is running on port ${port}`)
})