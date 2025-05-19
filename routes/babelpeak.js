const express = require('express');
const router = express.Router();

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