# ipse
ipse is a very simple version of the Dixit game that I made during the lockdown in February and March 2020 to play with my friends.

It is my first "full-stack" application written in Node.js, even if it's really simple, and it was the first time I used a MongoDB database. It's really a basic application, it does not support account management or even

The Dixit game is not my creation and I don't own any copyright of the game or the cards shown below. Dixit is an [Asmodee](https://www.asmodee.com) board game.

Here's some details:

## Waiting for inspiration
In the first part of the game the narrator must choose a card to play and an inspiration to guide the other players to his card.

![narrator](https://i.ibb.co/3RcY1YR/ipse-narratore-small.png)

## One card to trick them all

Once everyone has the inspiration all players must individually choose a card of their own to deceive the others in the final stage.

![match](https://i.ibb.co/fk7jGMz/ipse-match-small.png)

## Choose wisely

The last part of the match is about guessing which card was choosen by the narrator, you gain points if you guess correctly and if someone vote your card instead of the right one

![game](https://i.ibb.co/W5JnyY5/ipse-game-small.png)

## Dependancies
The backend is written in Node.js and uses Express 4.17 with a body-parser middleware. The database is MongoDB and in the application I use mongodb@3.5.5. The frontend is made using Marko@4.19 just because it was the fastest framework I was able to learn. I tried to use React and Vue but I couldn't do what I needed, with Marko.js it was relatively easy (I also have a friend named Marko so... :D). The application uses random@2.2 for the cards drawing and uuid@7.0 for generating the IDs of the players.

## Building and deployment

The app is really simple,
`git clone https://github.com/TGiulio/ipse.git` 
and
`npm install`
should do just fine

You'll need to configure you own MongoDB database with 2 collection:
- players
- match

you can leave the players collection empty. In the match collection you need to add 3 objects:

{
  "name": "playingCards",
  "winning":"",
  "value":[],
  "votes": []
  }
  
  {
  "name": "inspiration",
  "value":""
  }
  
  {
  "name": "usedCards",
  "value":[]
  }
  
  Once you have your database ready you can extract your connection URL and add it to the server.js file as "dburl" string variable.

01/2022
