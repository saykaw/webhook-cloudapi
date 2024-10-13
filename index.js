const express = require('express')
const bodyparser = require('body-parser')
const axios = require('axios')
const moment = require('moment')
require('dotenv').config()

const app = express().use(bodyparser.json())

const token = process.env.TOKEN //sending the request
const mytoken = process.env.MYTOKEN //verifying the webhook

app.listen(8000, () => {
    console.log('webhook is listening on port 8000')
});

app.get('/', ( req, res) => {
    res.status(200).send("The webhook is working.");
});

app.get('/webhook', (req, res) => {
    let mode = req.query["hub.mode"];
    let challenge = req.query["hub.challenge"];
    let token = req.query["hub.verify_token"];

    if(mode && token){
        if(mode === "subscribe" && token === mytoken){
            res.status(200).send(challenge);
        }else{
            res.status(403);  //status forbidden
        }
    }
});

const recentMessages = new Set();

app.post("/webhook",(req,res)=>{ 
    let body_param=req.body;

    if(body_param.object){
        if(body_param.entry &&
            body_param.entry[0].changes &&
            body_param.entry[0].changes[0].value &&
            body_param.entry[0].changes[0].value.messages &&
            body_param.entry[0].changes[0].value.messages[0] 
            ){
               let phone_no_id=body_param.entry[0].changes[0].value.metadata.phone_number_id;
               let from = body_param.entry[0].changes[0].value.messages[0].from; 
               let msg_body = body_param.entry[0].changes[0].value.messages[0].text.body;
               let messageId = body_param.entry[0].changes[0].value.messages[0].id;

               if (!recentMessages.has(messageId)) {
                recentMessages.add(messageId); 

                console.log("==LOGS==");
                console.log("Phone number: " + phone_no_id);
                console.log("From: " + from);
                console.log("Message body: " + msg_body);
                console.log("==LOGS==");

                //Initial template message: sent by user
                if(msg_body === "start" || msg_body === "Start" || msg_body === "hello" || msg_body === "Hello") {
                    responseMessage = "Hello, You have an outstanding payment on your account ACC1234XXXX. The amount pending is Rs 10,000. Would you like to pay it?";
                
                //Scenario 1: User ready to pay
                } else if(msg_body.includes("yes") || msg_body.includes("ready to pay")) {
                    let paymentLink = generatePaymentLink(from); // Assume this is a function that generates the payment link
                    responseMessage = "Great! You can pay using the following link: " + paymentLink;

                //Scenario 2: User not ready to pay
                } else if(msg_body.includes("no") || msg_body.includes("not ready") || msg_body.includes("not now") || msg_body.includes("later") || msg_body.includes("No") || msg_body.includes("Not ready") || msg_body.includes("Not now") || msg_body.includes("Later") || 
                 msg_body.includes("can't pay") ||  msg_body.includes("Can't pay") || msg_body.includes("unable to pay") || msg_body.includes("Unable to pay"))
                {
                    responseMessage = "Could you please let us know the reason? We'll follow up in 15 days. Please type 'Reason :' or 'reason :' and then type your reason.";
                } 
                //Scenario 3: Capture the reason and set a follow-up date
                else if(msg_body.includes("reason") || msg_body.includes("Reason")) {
                    let followUpDate = moment().add(15, 'days').format('DD-MM-YYYY');
                    responseMessage = "Thank you for letting us know. We'll follow up with you on " + followUpDate + ".";
                    
                } else {
                    responseMessage = "I didn't quite understand that?";
                }
                
                axios({
                    method: "POST",
                    url: "https://graph.facebook.com/v20.0/"+phone_no_id+"/messages?access_token="+token,
                    data: {
                        messaging_product: "whatsapp",
                        to: from,
                        text: {
                            body: responseMessage,
                        }
                    },
                    headers: {
                        "Content-Type": "application/json"
                    }
                }).then(response => {
                    console.log("Message sent successfully:", response.data);
                    markMessageAsRead(phone_no_id, messageId, token);
                }).catch(error => {
                    console.error("Error sending message:", error);
                });

                res.sendStatus(200); 
            } else {
                console.log("Message already processed; ignoring.");
                res.sendStatus(200); 
            }
        }
        else {
            console.log("Received a status update, not a new message.");
            res.sendStatus(200);
        }
    } else {
        console.log("Not a valid WhatsApp webhook event.");
        res.sendStatus(400);
    }
});

const markMessageAsRead = (phone_no_id, messageId, token) => {
    axios({
        method: "POST",
        url: "https://graph.facebook.com/v20.0/"+phone_no_id+"/messages",
        data: {
            messaging_product: "whatsapp",
            status: "read",
            message_id: messageId
        },
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    }).then(response => {
        console.log("Message marked as read successfully:", response.data);
    }).catch(error => {
        console.error("Error marking message as read:", error);
    });
};


const generatePaymentLink = () => {
    return "https://paymentlink.com/your-payment";
};
