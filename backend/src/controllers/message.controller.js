import cloudnary from "../lib/cloudnary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Messages from "../models/message.model.js"
import User from "../models/user.model.js";

export const getUsersForSlidebar= async (req,res) =>{
    try {
        const loggedInUserId = req.user._id;
        const filteredUsers = await User.find({_id:{ $ne: loggedInUserId } }).select("-password");

        res.status(200).json(filteredUsers);
    } catch (error) {
        console.error("Error in getUsersForSlidebar:",error.message);        
        res.status(500).json({error: "Internal server error"});
    }
};

export const getMessages = async (req,res) =>{
    try {
        const {id: userToChatId} = req.params;
        const myId = req.user._id;

        const messages = await Messages.find({
            $or: [
                { senderId: myId, receiverId: userToChatId },
                { senderId: userToChatId, receiverId: myId },
            ],
        });
        res.status(200).json(messages);
    } catch (error) {
        console.log("Error in getMessages Controllers:", error.message);
        res.status(500).json({error:"Internal server error"});
    }
};

export const sendMessage = async (req,res) =>{
    try {
        const { text, image} = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;

        let imageUrl;
        if(image){
            //Upload base image to cloudnary
            const uploadResponse = await cloudnary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        const newMessage = new Messages({
            senderId,
            receiverId,
            text,
            image: imageUrl
        });

        await newMessage.save();

        const receiverSocketId = getReceiverSocketId(receiverId);
        if(receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }


        res.status(201).json(newMessage);

    } catch (error) {
        console.log("Error in sendMessage controller:", error.meesage);
        res.status(500).json({error: "Internal server error"});
    }
}