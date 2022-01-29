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
const game = require(path.join(__dirname, 'template', 'game')); // votazione carte | card voting (3)
const room = require(path.join(__dirname, 'template', 'room')); // sala d'attesa | waiting room (1)
const match = require(path.join(__dirname, 'template', 'match')); // attesa del narratore e scelta della carta | waiting for narrator inspiration and choosing the card to play (2)
const points = require(path.join(__dirname, 'template', 'points')); // punteggio | score (4)
const narrator = require(path.join(__dirname, 'template', 'narrator')); // pagina del narratore | narrator page (2)
//create express app
const app=express();
//connect to the database
const MongoClient=mongodb.MongoClient;
const dburl='mongodb+srv://ipse:dixit@ipse-bniic.mongodb.net/test?retryWrites=true&w=majority'
const client = new MongoClient(dburl, { useUnifiedTopology: true });
client.connect((err)=> console.log(err))

// funzione per l'estrazione di una carta dal mazzo (pesca) restituisce il nome del file di una carta non in gioco
// card draw function, it returns the filename of a card not yet in the game (card filenames are numbers from 1 to 100)
const newCard= async function (){
  const db = client.db('ipse');
  let number;
  let ex;
  // recupera le carte già giocate
  // retrieve the played cards
  let usedCards=await db.collection('match').findOne({name:'usedCards'})
  // se le carte già usate sono almeno 94/100 allora ripulisce l'array e reinserisce solo quelle effettivamente in uso e quelle scartate tornano utilizzabili
  // if there are at least 94/100 cards already used, this clean the array and insert again only the card used at the moment, refreshing the deck of usable cards
  if(await usedCards.value.length>=94){
    console.log('rinnovo mazzo');
    await db.collection('match').updateOne({name:'usedCards'}, {$set: {value: []}})
    let players = await db.collection('players').find({}).toArray()
    for(let i=0;i<players.length;i++){
      await db.collection('match').updateOne({name:'usedCards'}, {$push: {value: {$each: players[i].cards}}})
    }
  }
  // genera un numero casuale fino a che quel numero non corrisponde ad una carta non ancora utilizzata
  // generate a random number until it represents a usable card
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
    // add the just drawn card to the used cards array and return the number of the card
  await db.collection('match').updateOne({name: 'usedCards'}, {$push: {value: number}});
  return number;
}

// ritorna un certo numero di carte estratte con la funzione precedente 
// returns a certain number of cards using previous function
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
// create a new player with the data received
app.post('/', (req, res)=>{
  (async function() {
  try {
    const db = client.db('ipse');
    // controlla che il nickname non sia già usato, in quel caso torno alla pagina principale chiedendo un nickname diverso
    // verify that the nickname is not already used, in that case it re-render the home page asking for a different nickname
    if(await db.collection('players').countDocuments({nickname: req.body.nickname})==0){
      // Inserisce il documento relativo al nuovo giocatore
      // create the new player document
      await db.collection('players').insertOne({
        id: await uuid.v4(),
        nickname: req.body.nickname,
        cards: [],
        points:0,
        vote:"",
        narrator: false,
        wasNarrator:false});
      // se nessuno dei giocatori è il narratore assegno a questo giocatore il ruolo di narratore
      // if no player is the narrator then it makes this player the narrator
      if(await db.collection('players').countDocuments({narrator: true})==0){
        await db.collection('players').updateOne({nickname: req.body.nickname}, {$set:{narrator: true}});
      }
      let player = await db.collection('players').findOne({nickname: req.body.nickname})
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
// waiting room, where players await for other players. It shows a list of connected players and assign the cards when they connect
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
// it retrieves the cards of the player and it shows them to him. The narrator will have his interface with the inspiration input field.
// when the narrator confirms the inspiration the other players can see it refreshing the page
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
// if the player is the narrator it get the winning card and the inspiration to show others
// else it's a player who chose his card to play
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
// once everyone has coosen a card they are visible and votable for all players
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
      // if all players have choosen a card the array of playing cards will lack of the winning one, here it adds the narrator card to the playing cards array and shuffles
    if(playingCards.value.length==players.length-1){
      await playingCards.value.splice(await random.int(0,players.length-1), 0, playingCards.winning)
      await db.collection('match').updateOne({name: 'playingCards'},{$set: {value: playingCards.value}})
      res.marko(game, {player: player, playingCards: playingCards.value, players:players, inspiration: inspiration.value});
    }else if(playingCards.value.length==players.length){ // se l'operazione precedente è già stata effettuata l'array playingCards avrà gia tutte le carte
      res.marko(game, {player: player, playingCards: playingCards.value, players:players, inspiration: inspiration.value});
    }else{ // se qualche giocatore non ha ancora scelto la carta nella pagina non si vedranno le carte | if a player is yet to choose there will be no cards shown
    res.marko(game, {players:players, inspiration: inspiration.value, player:player});
  }
  }
  } catch (err) {
    console.log(err.stack);
  }

})();
});

// i giocatori inviano il loro voto
// players vote the cards
app.post('/game', (req, res)=>{
  (async function() {
  try {
    const db = client.db('ipse');
    let playingCards = await db.collection('match').findOne({name: 'playingCards'});
    // inserisco la carta votata nell'array dei voti
    // add the voted card to the votes array
    await db.collection('match').updateOne({name:'playingCards'}, {$push: {votes: playingCards.value[req.body.vote-1]}})
    // registro il voto tra i dati del giocatore
    // records the vote in the player's data
    await db.collection('players').updateOne({id: req.body.id}, {$set:{vote: playingCards.value[req.body.vote-1]}})
    let players = await (db.collection('players').find({})).toArray();
    playingCards = await db.collection('match').findOne({name: 'playingCards'});
    if(playingCards.votes.length==players.length-1){ // se tutti hanno votato | if all voted
      if(await playingCards.votes.indexOf(playingCards.winning)==-1 || await playingCards.votes.every((val, i, arr)=> val==arr[0])){ // se tutti o nessuno ha votato quella corretta | if all players or none voted the right card
        await db.collection('players').updateMany({narrator:false}, {$inc: {points: 2}}) // do 2 punti a tutti tranne che al narratore | gives 2 point to all players but the narrator
      }
      else{
        await db.collection('players').updateOne({narrator:true}, {$inc: {points: 3}}) // do 3 punti al narratore | gives 3 points to the narrator
        for(let i=0;i<players.length;i++){ // scorro i vari voti, | scanning the votes
          if(players[i].vote==playingCards.winning){
            await db.collection('players').updateOne({id: players[i].id}, {$inc: {points: 3}}) // do 2 punti a chi ha votato la carta giusta, | gives 2 point to whom voted the right card
          }else{
            await db.collection('players').updateOne({cards: {$in: [players[i].vote]}}, {$inc: {points: 1}}) // altrimenti do 1 punto al possessore della carta votata | else, gives 1 point to the owner of the voted card
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
// score page, like the previous one but with the updated score
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

// altro match
// new match
app.get('/newMatch', async (req,res)=>{
  try{
    const db = client.db('ipse');
    let playingCards = await (db.collection('match').findOne({name: 'playingCards'}));
    let player = await db.collection('players').findOne({id: req.query.id})
    let players = await (db.collection('players').find({})).toArray();
    if(playingCards.value.length==players.length){
      for(let i=0;i<playingCards.value.length;i++){ // tolgo le carte giocate dalla mano dei giocatori | delete played cards from players' data
        await db.collection('players').updateOne({cards: {$in: [playingCards.value[i]]}}, {$pull: {cards: playingCards.value[i]}})
      }
      // azzero voti, frase di ispirazione e carte in gioco | clean votes, inpiration and playing cards
      await db.collection('players').updateMany({},{$set: {vote:""}})
      await db.collection('match').updateOne({name: "inspiration"}, {$set: {value:""}})
      await db.collection('match').updateOne({name: "playingCards"}, {$set: {value:[], votes:[], winning:""}})
      // cambio narratore | change narrator player
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
    if(await player.cards.length==0){ // se il giocatore non ha carte significa che la partita è finita e viene reindirizzato alla room | if the player has no cards it means that the game is over and he is redirected to the waiting room
      res.redirect('/room?id=' + req.query.id)
    }else if(await db.collection('players').countDocuments({points: {$gte: 30}})>0){ 
      // se il punteggio di qualcuno supera i 30 vengono azzerate tutte le carte perché la partita è finita
      // if someone has more than 30 points all the cards are cleaned and the game is over
      await db.collection('match').updateOne({name:"usedCards"}, {$set: {value:[]}});
      await db.collection('players').updateMany({}, {$set: {cards:[]}});
      res.redirect('/room?id=' + req.query.id);
    }else{
      player = await db.collection('players').findOne({id: req.query.id})
      if (player.cards.length<6){ // altrimenti viene data una carta ad ogni giocatore per far tornare tutti con 6 carte in mano e si ricomincia da match | else, a card is given to the players so they have 6 cards again and they are redirected to "match"
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
