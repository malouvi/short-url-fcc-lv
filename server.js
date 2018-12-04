'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var dns = require('dns');

var cors = require('cors');

var app = express();
var bodyParser = require('body-parser');
// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
mongoose.connect(process.env.MONGOLAB_URI, { useNewUrlParser: true });
//to stop DeprecationWarning: collection.ensureIndex is deprecated. Use createIndexes instead. warning
mongoose.set('useCreateIndex', true);
app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({extended:false}));

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

//Create a Schema and a Model
var urlSchema = new mongoose.Schema({
  original_url:{
    type:String,
    required: true,
    unique: true
  },
  short_url:{
    type: Number,
    required: true,
    unique: true
  }
});
//Model
var ShortURL=mongoose.model('ShortURL',urlSchema);

//Post request
app.post('/api/shorturl/new',(req,res)=>{
	let urlEntry = req.body.url;
  //Test url validity ,capture dns validUrl[1]
	const pattern=/^(?:https|http):\/\/([\w.-]+(?:\.[\w.-]+))/;
	const validUrl=pattern.exec(urlEntry);
	if(validUrl){
		dns.lookup(validUrl[1], function (err, host) {
			if(err){
				console.log(err);
				req.json( {"error":"invalid URL"}) ;
			}
			else{ 
        //Look for the new url in the database
				ShortURL.findOne( {original_url:urlEntry}, 'original_url short_url',function (err, results) {
					if (err){
						console.log(err);
						return;
					}
          //If it is not in the db create document, the short url will be the number of docs +1 
					if (!results){
						ShortURL.countDocuments({},(err,count)=>{
						if(err) {
							console.log(err);
							return;
						}
						let newUrl = new ShortURL({original_url:urlEntry,short_url:(count+1)});
						newUrl.save((err,newUrl)=>{
						  if(err){
							console.log(err);
							return;         
						  }
						  res.json({original_url:newUrl.original_url,short_url:newUrl.short_url});
						}); 
					 }); 
					}
          //The url was in the db 
					else{
					  res.json({original_url:results.original_url,short_url:results.short_url});            
					}
				});
			}      			
		});
	}
	else{
		res.json( {"error":"invalid URL"}) ;
	}
}); 
// get the short url and redirect to the original address
app.get('/api/shorturl/:url',(req,res)=>{
	ShortURL.findOne({short_url:req.params.url},(err,data)=>{
		if(err){
			console.log(err);
			return;
		}
		res.redirect(data.original_url);
		
	});
});


app.listen(port, function () {
  console.log('Node.js listening ...');
});