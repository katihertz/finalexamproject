const express = require('express');
const router = express.Router();

router.get("/",(req,res)=>{
    const username = req.query.username;
    res.send(`User ${username} has logged in`);
})

module.exports = router;