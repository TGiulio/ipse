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
const game = require(path.join(__dirname, 'template', 'game')); // votazioni carte (3)
const room = require(path.join(__dirname, 'template', 'room')); // sala d'attesa (1)
const match = require(path.join(__dirname, 'template', 'match')); // attesa narratore e selezione carta da giocare (2)
const points = require(path.join(__dirname, 'template', 'points')); // punteggi (4)
const narrator = require(path.join(__dirname, 'template', 'narrator')); // pagina del narratore (2)
//create express app
const app=express();
//connect to the database
const MongoClient=mongodb.MongoClient;
const dburl='mongodb+srv://ipse:xxxxx@ipse-bniic.mongodb.net/test?retryWrites=true&w=majority'
const client = new MongoClient(dburl, { useUnifiedTopology: true });
client.connect((err)=> console.log(err))

// funzione per l'estrazione di una carta dal mazzo (pesca) restituisce il nome del file di una carta non in gioco
const newCard= async function (){
  const db = client.db('ipse');
  let number;
  let ex;
  // recupera le carte già giocate
  let usedCards=await db.collection('match').findOne({name:'usedCards'})
  // se le carte già usate sono almeno 94/100 allora ripulisce l'array e reinserisce solo quelle effettivamente in uso e quelle scartate tornano utilizzabili
  if(await usedCards.value.length>=94){
    console.log('rinnovo mazzo');
    await db.collection('match').updateOne({name:'usedCards'}, {$set: {value: []}})
    let players = await db.collection('players').find({}).toArray()
    for(let i=0;i<players.length;i++){
      await db.collection('match').updateOne({name:'usedCards'}, {$push: {value: {$each: players[i].cards}}})
    }
  }
  // genera un numero casuale fino a che quel numero non corrisponde ad una carta che nessuno dei giocatori possiede
  do{
    number= await "../cards/" + random.int(1,100) + ".jpg";
    if(await db.collection('match').countDocuments({value: {$in: [number]}})>0){
      ex=true;
    }
    else {
      ex=false
    }
  }while(ex)
    // aggiunge il numero della carta appena estratta all'array delle carte in gioco e ritorna la carta
  await db.collection('match').updateOne({name: 'usedCards'}, {$push: {value: number}});
  return number;
}

// ritorna un certo numero di carte estratte con la funzione precedente 
const cardsAssign = async function (n){
  let cards=[];
  //let ex = false;
  for(let i=0; i<n;i++){
    cards.push(await newCard());
  }
  //console.log(cards.toString());
  return cards;
}


//middlewares
app.use(bodyParser.urlencoded({ extended: true }));

//ROUTES

// Home page
app.get('/', (req, res)=>{
  res.sendFile(path.join(__dirname,'template','home.html'));
})

// prende i dati inseriti dall'utente e crea un giocatore nel database
app.post('/', (req, res)=>{
  (async function() {
  try {
    const db = client.db('ipse');
    // controlla che il nickname non sia già usato, in quel caso torno alla pagina principale chiedendo un nickname diverso
    if(await db.collection('players').countDocuments({nickname: req.body.nickname})==0){
      // Inserisce il documento relativo al nuovo giocatore
      await db.collection('players').insertOne({
        id: await uuid.v4(),
        nickname: req.body.nickname,
        cards: [],
        points:0,
        vote:"",
        narrator: false,
        wasNarrator:false});
      // se nessuno dei giocatori è il narratore assegno a questo giocatore il ruolo di narratore
      if(await db.collection('players').countDocuments({narrator: true})==0){
        await db.collection('players').updateOne({nickname: req.body.nickname}, {$set:{narrator: true}});
      }
      let player = await db.collection('players').findOne({nickname: req.body.nickname})
      //const query= querystring.stringify({"id": player.id})
      console.log('new player inserted: ' + req.body.nickname);
      res.redirect('/room?id=' + player.id);

    }else{
    res.redirect('/');
  }
  } catch (err) {
    console.log(err.stack);
  }
})();
})

// Room dove i giocatori attendono che gli avversari si colleghino. Mostra la lista dei giocatori presenti e assegna le carte al momento del collegamento
app.get('/room', (req, res)=>{
  (async function() {
  try {
    const db = await client.db('ipse');
    if(await !req.query.id || db.collection('players').countDocuments({id: req.query.id})==0){
      res.redirect('/')
    }else{
      await db.collection('players').updateOne({id: req.query.id}, {$set: {cards: await cardsAssign(6), points: 0}})
      let players = await (db.collection('players').find({})).toArray();
      res.marko(room, {players:players, id: req.query.id });
    }
  } catch (err) {
    console.log(err.stack);
  }

})();
});

// recupera le carte di ogni giocatore e le mostro, al narratore mostro l'interfaccia del narratore con la possibilità di scrivere la frase di ispirazione.
// Quando il narratore ha scritto la frase i giocatori potranno vederla aggiornando la pagina
app.get('/match', (req, res)=>{
  (async function() {
  try {
    const db = await client.db('ipse');
    //controlla che l'id nell'URL corrisponda ad un giocatore nel database
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

// se il giocatore è narrratore invia la carta che ha scelto e la frase di ispirazione
// altrimenti un altro giocatore ha scelto la carta con cui partecipare
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

// schermata di gioco, una volta che tutti avranno scelto, le carte sarannno visibili e potranno essere votate
app.get('/game', (req, res)=>{
  (async function() {
  try {
    const db = await client.db('ipse');
    if(await !req.query.id || db.collection('players').countDocuments({id: req.query.id})==0){
      res.redirect('/')
    }else{
    let playingCards = await (db.collection('match').findOne({name: 'playingCards'}));
    let players = await (db.collection('players').find({})).toArray();
    let inspiration = await db.collection('match').findOne({name: "inspiration"});
    let player = await db.collection('players').findOne({id: req.query.id});
      // se tutti hanno scelto la carta l'array che le contiene avrà le carte dei giocatori ma non del narratore. Qui aggiungo la carta vincente all'array e le mescolo
    if(playingCards.value.length==players.length-1){
      await playingCards.value.splice(await random.int(0,players.length-1), 0, playingCards.winning)
      await db.collection('match').updateOne({name: 'playingCards'},{$set: {value: playingCards.value}})
      res.marko(game, {player: player, playingCards: playingCards.value, players:players, inspiration: inspiration.value});
    }else if(playingCards.value.length==players.length){ // se l'operazione precedente è già stata effettuata l'array playingCards avrà gia tutte le carte
      res.marko(game, {player: player, playingCards: playingCards.value, players:players, inspiration: inspiration.value});
    }else{ // se qualche giocatore non ha ancora scelto la carta nella pagina non si vedranno le carte
    res.marko(game, {players:players, inspiration: inspiration.value, player:player});
  }
  }
  } catch (err) {
    console.log(err.stack);
  }

})();
});

// i giocatori inviano il loro voto
app.post('/game', (req, res)=>{
  (async function() {
  try {
    const db = client.db('ipse');
    let playingCards = await db.collection('match').findOne({name: 'playingCards'});
    // inserisco la carta votata nell'array dei voti
    await db.collection('match').updateOne({name:'playingCards'}, {$push: {votes: playingCards.value[req.body.vote-1]}})
    // registro il voto tra i dati del giocatore
    await db.collection('players').updateOne({id: req.body.id}, {$set:{vote: playingCards.value[req.body.vote-1]}})
    let players = await (db.collection('players').find({})).toArray();
    playingCards = await db.collection('match').findOne({name: 'playingCards'});
    if(playingCards.votes.length==players.length-1){ // se tutti hanno votato
      if(await playingCards.votes.indexOf(playingCards.winning)==-1 || await playingCards.votes.every((val, i, arr)=> val==arr[0])){ // se tutti hanno votato quella corretta
        await db.collection('players').updateMany({narrator:false}, {$inc: {points: 2}}) // do 2 punti a tutti tranne che al narratore
      }
      else{
        await db.collection('players').updateOne({narrator:true}, {$inc: {points: 3}}) // do 3 punti al narratore
        for(let i=0;i<players.length;i++){ // scorro i vari voti,  
          if(players[i].vote==playingCards.winning){
            await db.collection('players').updateOne({id: players[i].id}, {$inc: {points: 3}}) // do 2 punti a chi ha votato la carta giusta,
          }else{
            await db.collection('players').updateOne({cards: {$in: [players[i].vote]}}, {$inc: {points: 1}}) // altrimenti do 1 punto al possessore della carta votata
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

// pagina identica alla precedente dove vengono aggiornati i punti una volta che tutti hanno votato
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
      for(let i=0;i<playingCards.value.length;i++){ // tolgo le carte giocate dalla mano dei giocatori
        await db.collection('players').updateOne({cards: {$in: [playingCards.value[i]]}}, {$pull: {cards: playingCards.value[i]}})
      }
      // azzero voti, frase di ispirazione e carte in gioco
      await db.collection('players').updateMany({},{$set: {vote:""}})
      await db.collection('match').updateOne({name: "inspiration"}, {$set: {value:""}})
      await db.collection('match').updateOne({name: "playingCards"}, {$set: {value:[], votes:[], winning:""}})
      // cambio narratore
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
    let usedCards = await db.collection('match').findOne({name: "usedCards"})
    if(await player.cards.length==0){ // se il giocatore non ha carte significa che la partita è finita e viene reindirizzato alla room
      res.redirect('/room?id=' + req.query.id)
    }else if(await db.collection('players').countDocuments({points: {$gte: 30}})>0){ 
      //se il punteggio di qualcuno supera i 30 vengono azzerate tutte le carte perché la partita è finita
      await db.collection('match').updateOne({name:"usedCards"}, {$set: {value:[]}});
      await db.collection('players').updateMany({}, {$set: {cards:[]}});
      res.redirect('/room?id=' + req.query.id);
    }else{
      player = await db.collection('players').findOne({id: req.query.id})
      if (player.cards.length<6){ // altrimenti viene data una carta ad ogni giocatore per far tornare tutti con 6 carte in mano e si ricomincia da match
        await db.collection('players').updateOne({id: req.query.id}, {$push:{cards: await newCard()}})
        res.redirect('/match?id='+ player.id)
    }

  }
  }catch(err){
    console.log(err.stack);
  }
})


app.use(express.static(path.join(__dirname,'template')));
app.listen(port);
console.log("listening");
