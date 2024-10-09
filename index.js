const express = require('express')
const bodyparser = require('body-parser')
const axios = require('axios')
require('dotenv').config()


const app = express().use(bodyparser.json())

const token = process.env.TOKEN //sending the request
const mytoken = process.env.MYTOKEN //verifying the webhook



app.get('/', ( req, res) => {
    console.log(`MYTOKEN: ${mytoken}`);
    res.status(200).send("The webhook is working.");
});

app.get('/webhook', (req, res) => {
    let mode = req.query["hub.mode"];
    let challenge = req.query["hub.challenge"];
    let token = req.query["hub.verify_token"];

    console.log(`Mode: ${mode}, Challenge: ${challenge}, Token: ${token}`);

    // const mytoken = "";

    if(mode && token){

        if(mode === "subscribe" && token === mytoken){
            res.status(200).send(challenge);
        }else{
            res.sendStatus(403);  //status forbidden
        }
    }
});

//if the user sends a message, reply to the user
app.post('/webhook', (req, res) => {
    let body = req.body;
    console.log(JSON.stringify(body, null,2)); 

    if(body.object){
        console.log("Inside body param")
        console.log("=====================================")
        if(body.entry &&
            body.entry[0].changes &&
            body.entry[0].changes[0].value.messages && 
            body.entry[0].changes[0].value.messages[0])
            {
                let phone_no_id = body.entry[0].changes[0].value.metadata.phone_number_id;
                let from = body.entry[0].changes[0].value.messages[0].from;
                let msg_body = body.entry[0].changes[0].value.messages[0].text.body;

                console.log("Phone number: "+phone_no_id);
                console.log("From: "+from);
                console.log("Message: "+msg_body);


                axios({
                    method: "POST",
                    url:"https://graph.facebook.com/v20.0/"+phone_no_id+"/messages?access_token="+token,
                    data:{
                        messaging_product:"whatsapp",
                        to:from,
                        text:{
                            body:"Hi, I'm from predixion ai. Message received successfully. Your message is: "+msg_body
                        }
                    },
                    headers:{
                        "Content-Type":"application/json"
                    }
                });
                res.sendStatus(200);
            }else{
                res.sendStatus(404); //if the event is not from whatsapp api
            }

    }
});


app.listen(8000, () => {
    console.log('webhook is listening on port 8000')
});


// app.listen(8000 || process.env.PORT, () => {
//     console.log('webhook is listening on port 8000')
// });