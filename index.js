const express= require('express');
const cors=require("cors")
const app=express();
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config();

const JwtSecret=process.env.JWT_SECRET
const PORT= process.env.PORT || 3000
const FRONTEND=process.env.CORS_ORIGIN

const allowedOrigins = [
  "https://daily-bloggers.onrender.com",
  "https://daily-bloggers.onrender.com/"
];
const JWT_SECRET = JwtSecret;
app.use(cookieParser());
app.use(express.json())

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      if (allowedOrigins.includes(origin) || !origin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    }
  })
);
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://daily-bloggers.onrender.com");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

const { UserSchema } = require("./db");
const {BlogPostSchema}=require("./db");
const {CommentModel}=require("./db");

// console.log(process.env.FRONTEND)



  app.post("/signin",async (req, res) => {
    try{
      const { username, password } = req.body;
    const USeRFINDER=await UserSchema.findOne({username:username,password:password})
    if(!USeRFINDER){
        return res.status(411).json({msg:"Enter the credentials correctly"})
     }
     const iddd=USeRFINDER._id;

    const token = jwt.sign({ id:iddd }, JWT_SECRET, { expiresIn: "1h" });
    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: 'none'  });
    return res.send("Logged in!" + token);
    }
    catch(error){
      console.log(error);
        if (error.name === 'ValidationError') {
          // Extract the specific validation error message
          const errorMessage = Object.values(error.errors).map(err => err.message).join(', ');
          return res.status(400).json({ msg: errorMessage });
      }
      else{
        res.status(500).json({ msg: "Internal Server Error while Signin" });
      }
    }
  });

  app.get("/",(req,res)=>{
    res.send("<h1>check</h1>")
  })
  
  app.post("/signup",async(req,res)=>{
    const {username,password,firstName,lastName,profession}=req.body;
    const USeRFINDER=await UserSchema.findOne({username:username})
   if(USeRFINDER){
       return res.status(411).json({msg:"User Already Exists"})
    }
    try{ 
        const dbUser=await UserSchema.create({
            username:username,
            password:password,
            firstName:firstName,
            lastName:lastName,
            profession:profession
        })
      const userIDd=dbUser._id.toString()
        const token = jwt.sign({id:userIDd}, JWT_SECRET, { expiresIn: 60*60 });
        res.cookie("token", token, { httpOnly: true, secure: true, sameSite: 'none' });
    }
    catch(error){
    console.log(error)
      if (error.name === 'ValidationError') {
        // Extract the specific validation error message
        const errorMessage = Object.values(error.errors).map(err => err.message).join(', ');
        return res.status(400).json({ msg: errorMessage });
    }
    else{
      res.status(500).json({ msg: "Internal Server Error while SignUp" });
    }       
    }
    return res.status(200).json({msg:"The user data is saved"})
})


app.get("/user", (req, res) => {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }
  
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      // Fetch user email or other details from the database using decoded.id
      res.json({ userId: decoded.id });
  
    } catch (err) {
      console.log(err)
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
  });
  
  app.post("/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ message: "Logged out!" });
  });

  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "src", "index.html"));
  });
  














app.get('/posts',async(req,res)=>{
    try{
        const blogs = await BlogPostSchema.find()
            .sort({ TimePost: -1 })
            .populate('user', 'username firstName lastName profession');
        res.status(200).json(blogs);
    }
    catch(err){
      console.log(err);
      res.status(500).json({msg:"Internal Server Error while getting the Blogs"})
    }
})




const authenticateToken = (req, res, next) => {
    const token = req.cookies ? req.cookies.token : null;

    if (!token) {
        return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id // Extract userId from the decoded token
        next();
    } catch (err) {
        return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
};


app.get('/posts/:id',async(req,res)=>{
try{const id=req.params.id;
const post=await BlogPostSchema.findById(id);
res.json(post)}
catch(err){
    console.log(err);
    res.status(500).json({msg:"Server Error :/getById"})

}
})


app.post('/posts', authenticateToken, async (req, res) => {

    try {
        const { Title, Post } = req.body;
        const userId = req.userId; // Ensure userId is set

        if (!Title || !Post || !userId) {
            return res.status(400).json({ msg: "Post data or user ID is missing" });
        }

        const timer = new Date();
        const posting = await BlogPostSchema.create({
            Title,
            Post,
            TimePost: timer,
            user: userId // Include the user field
        });

        res.status(201).json(posting);
    } catch (error) {
        console.log(error);
        if (error.name === 'ValidationError') {
          // Extract the specific validation error message
          const errorMessage = Object.values(error.errors).map(err => err.message).join(', ');
          return res.status(400).json({ msg: errorMessage });
      }
        res.status(500).json({ msg: "Internal Server Error while posting the Blog" });
    }
});




app.put('/posts/:id',async(req,res)=>{
 try{
    const id=req.params.id;
    if(!id || id == "undefined"){
        return res.status(400).json({msg:"The id is invalid"})
    }
    const post=await BlogPostSchema.findById(id);
    if(!post){
        return res.status(400).json({msg:"The Blog was not found"})
    }
    post.Title=req.body.Title,
    post.Post=req.body.Post
    await post.save();
    res.status(200).json({msg:"The Blog was updated"})
 }
 catch(err){

console.log(err);

res.status(500).json({msg:"Internal Server Error while updating the Blog"})
 }
})


app.delete('/posts/:id',async(req,res)=>{
try{
    const id=req.params.id;
    if(!id || id == "undefined"){
        return res.status(400).json({msg:"The id is invalid"})
    }
    const post=await BlogPostSchema.findById(id);
    if(!post){
        return res.status(400).json({msg:"The Blog was not found"})
    }
    await BlogPostSchema.deleteOne({_id:id})
    
    res.status(200).json({msg:"The Blog was deleted"})
 }
 catch(err){

console.log(err);
res.status(500).json({msg:"Internal Server Error while deleting the Blog"})
 }

})

app.get('/comments/:postId', async (req, res) => {
    try {
      const comments = await CommentModel.find({ post: req.params.postId })
        .populate('user', 'username')
        .sort({ createdAt: -1 });
      res.json(comments);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching comments" });
    }
  });

  app.post('/comments', authenticateToken, async (req, res) => {
    try {
      const { postId, content } = req.body;
      const comment = new CommentModel({
        content,
        user: req.userId,
        post: postId
      });
      await comment.save();
      res.status(201).json(comment);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error adding comment" });
    }
  });

app.listen(PORT,()=>{
    console.log(`The Sereve is started on http://localhost:3000`)
})


