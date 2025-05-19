const express = require('express');
const router = express.Router();
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


// page where you communicate with the emergent property

router.get('/', (req, res) => {
    
    let variables = {
        voice: "",
        testData: "",
        user: req.session.user,
    };

    res.render('babelpeak', variables);
});

router.post('/', async (req, res) => {
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

module.exports = router;