//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");


const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

// connect to mongodb database
mongoose.connect("mongodb://localhost:27017/todolistDB");


// *********    CREATE   ********* //
// schema for items
const itemsSchema = {
  name: String,
};

// mongoose model based on itemsSchema
// mongoose models usually use capitalization
// use the singular version of the collection name, so Item will turn into items automatically by mongoose
const Item = mongoose.model(
  "Item",
  itemsSchema,
);

// create documents to be added into db
const item1 = new Item ({
  name: "Welcome to your todolist!"
});

const item2 = new Item ({
  name: "Hit the + button to add a new item"
});

const item3 = new Item ({
  name: "<-- Hit this to delete an item."
});

const defaultItems = [item1, item2, item3];


const listSchema = {
  name: String,
  items: [itemsSchema],
}

const List = mongoose.model("List", listSchema);


// *********    CREATE   ********* //


app.get("/", function(req, res) {

  // finds everything in the Item (items) collection
  Item.find({}, function(err, foundItems){

    // inserts default items into db if there are currently no other items in the db
    if (foundItems.length === 0){
      Item.insertMany(defaultItems, function(err){
        if (err){
          console.log(err);
        } else {
          console.log("Successfully saved default items to DB.");
        }
      });
      // redirects back to / after the items above are inserted into the db, then the if statement would go into the else block so it get can grendered
      res.redirect("/");
    } else {
          res.render("list", {listTitle: "Today", newListItems: foundItems});
    }
  });
});

// creating a dynamic route to create a list based on parameter in url
app.get("/:customListName", function(req, res){
  const customListName = _.capitalize(req.params.customListName);

  List.findOne({name: customListName}, function(err, foundList){
    if (!err){
      if (!foundList){
        // Create a new list
        const list = new List({
          name: customListName,
          items: defaultItems,
        });
        list.save();
        res.redirect("/" + customListName);
      } else {
        // show an existing list
        res.render("list", {listTitle: foundList.name, newListItems: foundList.items})
      }
    }
  })
});




app.post("/", function(req, res){

  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({
    name: itemName,
  });

  if (listName === "Today"){
    item.save();
    res.redirect("/");
  } else {
    // finds the custom list and adds the new item to that custom list, then redirects to the custom list url
    List.findOne({name: listName}, function(err, foundList){
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }
});

app.post("/delete", function(req, res){
  // this is returning the item id from the item that was clicked in the checkbox input in the list.ejs view
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === "Today"){
    Item.findByIdAndRemove(checkedItemId, function(err){
      if (!err) {
        console.log("Successfully deleted checked item.");
        res.redirect("/");
      }
    });
  } else {
    // the $ symbol means that the method is coming straight from mongodb (use docs)
    // pull from an items array an item that has an item id that corresponds to checkedItemId
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}}, function(err, foundList){
      if (!err){
        res.redirect("/" + listName);
      }
    });
  }
});



app.get("/about", function(req, res){
  res.render("about");
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
