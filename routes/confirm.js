const express = require('express');
const router = express.Router();

router.get("/",(req,res)=>{
    message = `User ${req.session.user} has logged in`;
    res.send(message);
})

module.exports = router;