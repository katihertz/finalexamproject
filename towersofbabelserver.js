const express = require('express');
const app = express();
const bodyParser = require("body-parser");
const path = require("path");
const port = process.env.PORT || 4000;
const cookieParser = require("cookie-parser");
const session = require("express-session");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config({
    path: path.resolve(__dirname, "credentialsDontPost/.env"),
 });
app.use(express.static(path.join(__dirname, 'assets')));
const databaseName = "Babel_Users";
const collectionName = "Users";
const uri = process.env.MONGO_CONNECTION_STRING;
const mongoClient = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });

// just imports OpenAi and sets it up
const OpenAi = require("openai");
const client = new OpenAi({
    apiKey: process.env.OPENAI_API_KEY
});
const model = "gpt-4.1-mini";
const instruction = "Categorize the following request as one of the seven deadly sins ['Lust', 'Gluttony', 'Pride', 'Sloth', 'Wrath', 'Greed', 'Envy']. Respond with only one word, that word being the sin that the request is categorized as. ";

// middleware
app.set("view engine", "ejs");
app.set("views", path.resolve(__dirname, "templates"));
app.use(bodyParser.urlencoded({extended:false}));
app.use(cookieParser());

const confirm = require("./routes/confirm");
app.use("/confirm",confirm);

// Maybe look at secret again later
app.use(
    session({
      resave: true,
      saveUninitialized: false,
      secret: process.env.SESSION_SECRET, // use .env for secret string
    })
  );

let sinMap = {"GREED": "The emergent property laughs at you",
    "ENVY": "The emergent property thinks you are pathetic",
    "GLUTTONY": "The emergent property's stomach growls",
    "SLOTH": "The emergent property stares at you with disdain",
    "LUST": "You can hear the emergent property's heartbeat",
    "PRIDE": "You mean nothing to the emergent property",
    "WRATH": "The emergent property understands you",
};
app.get('/', (req, res) => {
    res.render('disclaimer');
});


app.get('/login', (req, res) => {
    res.render('login');
});

// set cookies to remember which user this is

app.post('/login', async (req, res) => {
    req.session.user = req.body.username;
    req.session.save();
    try {
        await mongoClient.connect();
        const database = mongoClient.db(databaseName);
        const collection = database.collection(collectionName);

        const user = req.session.user;
        let filter = {user: user};

        // if user does not exist, create user
        let result = await collection.findOne(filter);
        if (!result) {

            let wishMap = {
                "GREED": 0,
    "ENVY": 0,
    "GLUTTONY": 0,
    "SLOTH": 0,
    "LUST": 0,
    "PRIDE": 0,
    "WRATH": 0,
    "OTHER": 0,
            };

            newUser = {
                user: user,
                wishes: wishMap,
            };

            let result = await collection.insertOne(newUser);
            console.log(result.name)
        }
    } catch {
        console.error(e);
    } finally {
        await mongoClient.close();
    }

    //message = `User ${req.session.user} has logged in`;
    //res.send(message);
    res.redirect(`/confirm?username=${req.session.user}`);
});

// page where you communicate with the emergent property

app.get('/babelpeak', (req, res) => {
    
    let variables = {
        voice: "",
        testData: "",
        user: req.session.user,
    };

    res.render('babelpeak', variables);
});

app.post('/babelpeak', async (req, res) => {
    let wish = req.body.wish;

    const response = await client.responses.create({
        model: model,
        instructions: instruction,
        input: wish,
    });

    // data cleaning

    let sin = response.output_text;
    sin = sin.toUpperCase();
    
    // Update database

    try {
        await mongoClient.connect();
        const database = mongoClient.db(databaseName);
        const collection = database.collection(collectionName);

        const user = req.session.user;
        let filter = {user: user};

        let result = await collection.findOne(filter);
        console.log(result);

        if (sin in result.wishes) {
            result.wishes[sin] += 1;
        } else {
            result.wishes["OTHER"] += 1;
        }
        
        const newValues = {wishes: result.wishes};
        filter = {user: user};
        const update = { $set: newValues };

        result = await collection.updateOne(filter, update);

    } catch {
        console.error(e)
    } finally {
        await mongoClient.close();
    }

    let variables = {
        voice: sin in sinMap ? sinMap[sin] : "It stares at you",
        testData: "",
        user: req.session.user,
    }

    res.render('babelpeak', variables);
})

app.get('/debug', async (req, res) => {
    try {
        await mongoClient.connect();
        const database = mongoClient.db(databaseName);
        const collection = database.collection(collectionName);
  
        const filter = {};
        cursor = collection.find(filter);
        result = await cursor.toArray();
        console.log(`Found: ${result.length} movies`);
        console.log(result);
     } catch (e) {
        console.error(e);
     } finally {
        await mongoClient.close();
     }

     res.send(result);
})
app.listen(port);