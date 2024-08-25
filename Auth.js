const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const path = require("path");
const { UserSchema } = require("./db");

const JWT_SECRET = "test123";

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(
  cors({
    credentials: true,
    origin: "http://localhost:5173",
  })
);

app.post("/signin",async (req, res) => {
  const { username, password } = req.body;
  const USeRFINDER=await UserSchema.findOne({username:username,password:password})
  if(!USeRFINDER){
      return res.status(411).json({msg:"Enter the credentials correctly"})
   }
   
  const token = jwt.sign({ password:password }, JWT_SECRET, { expiresIn: "1h" });
  res.cookie("token", token, { httpOnly: true, secure: true });
  return res.send("Logged in!" + token);
});




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
        res.cookie("token", token, { httpOnly: true, secure: true });
    }
    catch(error){
        if (error.name === 'ValidationError') {
            const field = Object.keys(error.errors)[0];
            const message = error.errors[field].message;
            return res.status(402).json({message})
        }  
        
        return res.status(500).json({msg:"error occured"})        
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
