const express = require('express');
const router = express.Router();

router.get("/",(req,res)=>{
    const username = req.query.username;
    res.send(`User ${username} has logged in<br><br>
        <a href="/babelpeak">Climb The Tower</a>`);
})

module.exports = router;