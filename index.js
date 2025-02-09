const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
  origin: [
    'https://gleeful-semolina-b8a7d1.netlify.app',
    'https://job-flow-33fe0.firebaseapp.com',
    'https://job-flow-33fe0.web.app'
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cj9n1qe.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// middlewares 
const logger = (req, res, next) => {
  console.log('log: info', req.method, req.url);
  next();
}

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  // console.log('token in the middleware', token);
  // no token available 
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded;
    next();
  })
}

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
    app.post('/jwt', logger, async (req, res) => {
      const user = req.body;
      console.log('user for token', user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      })
        .send({ success: true });
    })

    app.post('/logout', async (req, res) => {
      const user = req.body;
      console.log('logging out', user);
      res.clearCookie('token',
        {
          maxAge: 0,
          secure: true,
          sameSite: 'none'
        })
        .send({ success: true })
    })

    //  Bids

    app.get('/bids', logger, verifyToken, async (req, res) => {
      console.log(req.query.userEmail);
      console.log('cook cookies', req.cookies);
      let query = {};
      let result = null;
      if (req.query?.userEmail) {
        query = { userEmail: req.query.userEmail }
        result = await bidsCollection.find(query).sort({ '_id': 1 }).toArray();
      }
      if (req.query?.ownerEmail) {
        query = { ownerEmail: req.query.ownerEmail }
        result = await bidsCollection.find(query).sort({ '_id': 1 }).toArray();
      }

      else {
        result = await bidsCollection.find(query).sort({ 'status': 1 }).toArray();
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