require("marko/node-require");
const uuid = require('uuid');
const path = require('path');
const random = require('random');
const express = require('express');
const mongodb = require('mongodb');
const bodyParser = require('body-parser');
const querystring = require('querystring');
let markoExpress = require("marko/express");


const port = process.env.PORT || 3000;
const game = require(path.join(__dirname, 'template', 'game'));
const room = require(path.join(__dirname, 'template', 'room'));
const match = require(path.join(__dirname, 'template', 'match'));
const points = require(path.join(__dirname, 'template', 'points'));
const narrator = require(path.join(__dirname, 'template', 'narrator'));
//create express app
const app=express();
//connect to the database
const MongoClient=mongodb.MongoClient;
const dburl='mongodb+srv://ipse:dixit@ipse-bniic.mongodb.net/test?retryWrites=true&w=majority'
const client = new MongoClient(dburl, { useUnifiedTopology: true });
client.connect((err)=> console.log(err))


const newCard= async function (){
  const db = client.db('ipse');
  let number;
  let ex;
  do{
    number= await "../cards/" +random.int(1,100) + ".jpg";
    if(await db.collection('match').countDocuments({value: {$in: [number]}})>0){
      ex=true;
    }
    else {
      ex=false
    }
  }while(ex)
  await db.collection('match').updateOne({name: 'usedCards'}, {$push: {value: number}});
  return number;
}

const cardsAssign = async function (n){
  let cards=[];
  let ex = false;
  for(let i=0; i<n;i++){
    cards.push(await newCard());
  }
  //console.log(cards.toString());
  return cards;
}


//middlewares
app.use(bodyParser.urlencoded({ extended: true }));

//routes
app.get('/', (req, res)=>{
  res.sendFile(path.join(__dirname,'template','home.html'));
})

app.post('/', (req, res)=>{
  (async function() {
  try {
    const db = client.db('ipse');
    if(await db.collection('players').countDocuments({nickname: req.body.nickname})==0){
      // Insert a single document
      await db.collection('players').insertOne({
        id: await uuid.v4(),
        nickname: req.body.nickname,
        cards: await cardsAssign(6),
        points:0,
        vote:"",
        narrator: false,
        wasNarrator:false});
      if(await db.collection('players').countDocuments({narrator: true})==0){
        await db.collection('players').updateOne({nickname: req.body.nickname}, {$set:{narrator: true}});
      }
      let player = await db.collection('players').findOne({nickname: req.body.nickname})
      const query= querystring.stringify({"id": player.id})
      console.log('new player inserted: ' + req.body.nickname);
      res.redirect('/room?' + query);

    }else{
    res.redirect('/');
  }
  } catch (err) {
    console.log(err.stack);
  }
})();
})

app.get('/room', (req, res)=>{
  (async function() {
  try {
    const db = await client.db('ipse');
    if(await !req.query.id || db.collection('players').countDocuments({id: req.query.id})==0){
      res.redirect('/')
    }else{
    let players = await (db.collection('players').find({})).toArray();
    res.marko(room, {players:players, id: req.query.id });
    }
  } catch (err) {
    console.log(err.stack);
  }

})();
});

app.get('/match', (req, res)=>{
  (async function() {
  try {
    const db = await client.db('ipse');
    if(await !req.query.id || db.collection('players').countDocuments({id: req.query.id})==0){
      res.redirect('/')
    }else{
      let players = await (db.collection('players').find({})).toArray();
      let player = await db.collection('players').findOne({id: req.query.id})
      let inspiration = await db.collection('match').findOne({name: "inspiration"})
      if(player.narrator){
        res.marko(narrator, {players:players, player:player,})
      }else{
        res.marko(match, {players:players, player:player, inspiration: inspiration.value});
      }
    }
  } catch (err) {
    console.log(err.stack);
  }

})();
});

app.post('/match', (req, res)=>{
  (async function() {
  try {
    const db = client.db('ipse');
    let player = await db.collection('players').findOne({id: req.body.id})
    if(player.narrator){
      await db.collection('match').updateOne({name: 'inspiration'}, {$set: {value: req.body.inspiration}})
      await db.collection('match').updateOne({name: 'playingCards'}, {$set:{winning:player.cards[req.body.card-1]}})
      res.redirect('/points?id=' + req.body.id)
    }else{
      await db.collection('match').updateOne({name: 'playingCards'}, {$push:{value:player.cards[req.body.card-1]}})
      res.redirect('/game?id=' + req.body.id)
    }

  } catch (err) {
    console.log(err.stack);
  }

})();
});

app.get('/game', (req, res)=>{
  (async function() {
  try {
    const db = await client.db('ipse');
    if(await !req.query.id || db.collection('players').countDocuments({id: req.query.id})==0){
      res.redirect('/')
    }else{
    let playingCards = await (db.collection('match').findOne({name: 'playingCards'}));
    let players = await (db.collection('players').find({})).toArray();
    let inspiration = await db.collection('match').findOne({name: "inspiration"})
    let player = await db.collection('players').findOne({id: req.query.id})
    if(playingCards.value.length==players.length-1){
      await playingCards.value.splice(await random.int(0,players.length-1), 0, playingCards.winning)
      await db.collection('match').updateOne({name: 'playingCards'},{$set: {value: playingCards.value}})
      res.marko(game, {player: player, playingCards: playingCards.value, players:players, inspiration: inspiration.value});
    }else if(playingCards.value.length==players.length){
      res.marko(game, {player: player, playingCards: playingCards.value, players:players, inspiration: inspiration.value});
    }else{
    res.marko(game, {players:players, inspiration: inspiration.value, player:player});
  }
  }
  } catch (err) {
    console.log(err.stack);
  }

})();
});

app.post('/game', (req, res)=>{
  (async function() {
  try {
    const db = client.db('ipse');
    let playingCards = await db.collection('match').findOne({name: 'playingCards'});
    await db.collection('match').updateOne({name:'playingCards'}, {$push: {votes: playingCards.value[req.body.vote-1]}})
    await db.collection('players').updateOne({id: req.body.id}, {$set:{vote: playingCards.value[req.body.vote-1]}})
    let players = await (db.collection('players').find({})).toArray();
    playingCards = await db.collection('match').findOne({name: 'playingCards'});
    if(playingCards.votes.length==players.length-1){
      if(await playingCards.votes.indexOf(playingCards.winning)==-1 || await playingCards.votes.every((val, i, arr)=> val==arr[0])){
        await db.collection('players').updateMany({narrator:false}, {$inc: {points: 2}})
      }
      else{
        await db.collection('players').updateOne({narrator:true}, {$inc: {points: 3}})
        for(let i=0;i<players.length;i++){
          if(players[i].vote==playingCards.winning){
            await db.collection('players').updateOne({id: players[i].id}, {$inc: {points: 3}})
          }else{
            await db.collection('players').updateOne({cards: {$in: [players[i].vote]}}, {$inc: {points: 1}})
          }
        }
      }
    }
    res.redirect('/points?id='+ req.body.id);
  } catch (err) {
    console.log(err.stack);
  }

})();
});

app.get('/points', async (req,res)=>{
  try{
    const db = await client.db('ipse');
    if(await !req.query.id || db.collection('players').countDocuments({id: req.query.id})==0){
      res.redirect('/')
    }else{
    let playingCards = await (db.collection('match').findOne({name: 'playingCards'}));
    let players = await (db.collection('players').find({})).toArray();
    let inspiration = await db.collection('match').findOne({name: "inspiration"})
    let player = await db.collection('players').findOne({id: req.query.id})
    res.marko(points, {player: player, playingCards: playingCards.value, players:players, inspiration: inspiration.value})
  }
  }catch(err){
    console.log(err.stack);
  }
})

app.get('/newMatch', async (req,res)=>{
  try{
    const db = client.db('ipse');
    let playingCards = await (db.collection('match').findOne({name: 'playingCards'}));
    let player = await db.collection('players').findOne({id: req.query.id})
    let players = await (db.collection('players').find({})).toArray();
    if(playingCards.value.length==players.length){
      for(let i=0;i<playingCards.value.length;i++){
        await db.collection('players').updateOne({cards: {$in: [playingCards.value[i]]}}, {$pull: {cards: playingCards.value[i]}})
      }
      await db.collection('players').updateMany({},{$set: {vote:""}})
      await db.collection('match').updateOne({name: "inspiration"}, {$set: {value:""}})
      await db.collection('match').updateOne({name: "playingCards"}, {$set: {value:[], votes:[], winning:""}})
      await db.collection('players').updateOne({narrator:true}, {$set: {narrator:false, wasNarrator:true}})
      if(await db.collection('players').countDocuments({wasNarrator: false})>0){
        await db.collection('players').updateOne({wasNarrator:false}, {$set: {narrator:true}})
        console.log('cambiato narratore');
       }
      else{
        await db.collection('players').updateMany({}, {$set: {wasNarrator:false}})
        await db.collection('players').updateOne({}, {$set: {narrator:true}})
      }
    }
    player = await db.collection('players').findOne({id: req.query.id})
    if (player.cards.length<6){
      await db.collection('players').updateOne({id: req.query.id}, {$push:{cards: await newCard()}})
    }
    res.redirect('/match?id='+ player.id)
  }catch(err){
    console.log(err.stack);
  }
})


app.use(express.static(path.join(__dirname,'template')));
app.listen(port);
console.log("listening on port 3000");
