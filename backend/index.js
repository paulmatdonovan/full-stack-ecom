const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { log } = require("console");

app.use(express.json());
app.use(cors());

//Database Connection with MongoDB
mongoose.connect("mongodb+srv://paulmattdonovan:E26ZvwuVJ6A24waP@cluster0.ysa6e.mongodb.net/e-commerce");

//API Creation

app.get("/",(req,res)=>{
res.send("Express App is Running")
})

// Image storage engine

const storage = multer.diskStorage({
    destination: './upload/images',
    filename:(req,file,cb)=>{
        return cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

const upload = multer({storage:storage})

//Creating Upload for images

app.use('/images',express.static('upload/images'))

app.post("/upload",upload.single('product'),(req,res)=>{
    res.json({
success:1,
image_url:`http://localhost:${port}/images/${req.file.filename}`
    })
})

//Schema for Creating Porducts

const Product = mongoose.model("Product",{
    id:{
        type: Number,
        required: true,
    },
    name: {
        type: String,
        required:true,
    },
    image: {
        type: String,
        required:true,
    },
    category:{
        type: String,
        required: true,
    },
    new_price:{
        type: Number,
        required: true,
    },
    date:{
        type: Date,
        default:Date.now,
    },
    available:{
        type: Boolean,
        default: true,
    },
})

app.post('/addproduct',async(req,res)=>{
    let products = await Product.find({});
    let id;
    if(products.length>0){
let last_product_array = products.slice(-1);
let last_product = last_product_array[0];
id = last_product.id+1;
    }
    else{
        id=1;
    }
const product = new Product({
    id:id,
    name:req.body.name,
    image: req.body.image,
    category: req.body.category,
    new_price: req.body.new_price,
});
console.log(product);
await product.save();
console.log("Saved")
res.json({
    success:true,
    name: req.body.name,
})
})

// Creating API for deleting products

app.post('/removeproduct', async(req,res)=>{
    await Product.findOneAndDelete({id:req.body.id})
    console.log("removed")
    res.json({
        success: true,
        name: req.body.name
    })
})

//creating API for getting all products

app.get('/allproducts', async (req,res)=>{
let products = await Product.find({});
console.log("All products fetched");
res.send(products);
})

// Schema created for user model 

const Users = mongoose.model('Users',{
    name:{
        type:String,
    },
    email:{
        type: String,
        unique:true,
    },
    password:{
        type: String,
    },
    cartData:{
        type:Object,
    },
    date:{
        type:Date,
        default:Date.now,
    }
})

// Creating endpoint for registering user

app.post('/signup',async(req,res)=>{

    let check = await Users.findOne({email:req.body.email});
    if(check){
return res.status(400).json({success:false, errors:'existing user found with same email address'})
    }
    let cart = {};
    for (let index = 0; index < 300; index++) {
        cart[index]=0;
    }
    const user = new Users({
        name:req.body.username,
        email:req.body.email,
        password:req.body.password,
        cartData:cart
    })
    await user.save();
    // create a user token 
    const data = {
        user:{
            id:user.id
        }
    }
    const token = jwt.sign(data,'secret_ecom');
    res.json({success:token});
})

// creating endpoint for user login
// cretaing a token 

app.post('/login', async(req,res)=>{
    let user = await Users.findOne({email:req.body.email});
    if(user){
        const passCompare = req.body.password === user.password;
        if(passCompare){
            const data = {
                user:{
                    id:user.id
                }
            }
            const token = jwt.sign(data,'secret-ecom');
            res.json({success:true,token})
        }
        else{
            res.json({
                success:false,errors:"Wrong Password"
            })
        }
    }
    else{
        res.json({success:false,errors:"Wrong email id"})
    }
})

//crreating middleware to fetch user
const fetchUser = async(req,res,next)=>{
const token = req.header('auth-token');
if (!token){
    res.status(401).send({errors:"Please authenticate using valid token"})
} else{
    try{
        const data = jwt.verify(token,'secret_ecom')
        req.user = data.user;
        next();
    } catch(error){
res.status(401).send({errors:"please authenticate using a valid token"})
    }
}
}


// adding products in cart
app.post('/addtocart', fetchUser, async(req,res)=>{
    // console.log(req.body,req.user);
    let userData = await Users.findOne({_id:req.user.id});
    userData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData})
res.send("Added")
})

// new collection data 
app.get('/newcollections', async(req,res)=>{
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    console.log("NewCollection Fetched")
    res.send(newcollection)
})

//popular in women

app.get('/popularinwomen', async(req, res)=>{
    let products = await Product.find({category:"women"});
    let popular_in_women = products.slice(0,4);
    console.log("Popular in women fetched")
    res.send(popular_in_women)
})

app.listen(port,(error)=>{
    if(!error){
        console.log("Server running on port"+port)
    }
    else{
        console.log("Error: "+error)
    }
})