const express = require('express');
const router = express.Router();
const bodyParser = require("body-parser");
const path = require("path");
const port = process.env.PORT || 4000;
const cookieParser = require("cookie-parser");
const session = require("express-session");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config({
    path: path.resolve(__dirname, "credentialsDontPost/.env"),
 });
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

let sinMap = {"GREED": "The emergent property laughs at you",
    "ENVY": "The emergent property thinks you are pathetic",
    "GLUTTONY": "The emergent property's stomach growls",
    "SLOTH": "The emergent property stares at you with disdain",
    "LUST": "You can hear the emergent property's heartbeat",
    "PRIDE": "You mean nothing to the emergent property",
    "WRATH": "The emergent property understands you",
};

// page where you communicate with the emergent property

router.get('/', (req, res) => {
    
    let variables = {
        voice: "",
        testData: "",
        user: req.session.user,
        innerHTML:""
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
        console.error(e);
    } finally {
        await mongoClient.close();
    }

    let variables = {
        voice: sin in sinMap ? sinMap[sin] : "It stares at you",
        testData: "",
        user: req.session.user,
        innerHTML: '<a href="/babelpeak/display">see your wishes</a>'
    }

    res.render('babelpeak', variables);
});

router.get("/display",async (req,res)=>{
    let result;
    let user = req.session.user;
    try {
        await mongoClient.connect();
        const database = mongoClient.db(databaseName);
        const collection = database.collection(collectionName);

        let filter = {user: user};
        result = await collection.findOne(filter);
        console.log(result);

    } catch {
        console.error(e);
    } finally {
        await mongoClient.close();
    }
    if (!result || !result.wishes) {
        return res.render('display', { user: user, wishTable: "<p>No data available</p>" });
    }
    const table = getTable(result.wishes);
    res.render('display', {user: user, wishTable: table});
});

function getTable(data){
    let table = "<table style='border: 1px solid'><tr><th style='border: 1px solid'>Sin</th><th style='border: 1px solid'>count</th></tr>";
    Object.entries(data).forEach(([sin,count]) => {
        table += `<tr><td style='border: 1px solid'>${sin}</td><td style='border: 1px solid'>${count}</td></tr>`
    });
    table += "</table>";
    return table;
}

module.exports = router;