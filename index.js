const express = require('express');
require('dotenv').config();
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
console.log(process.env.MONGO_URI);
mongoose.connect(process.env.MONGO_URI);

const { Schema, model } = mongoose;

const UserSchema = new Schema({
    username: String,
});

const ExerciseSchema = new Schema({
    username: String,
    description: String,
    duration: Number,
    date: Date,
    user_id: String,
});

let UserNameConstructor = model('UserNameConstructor', UserSchema);
let ExerciseModelConstructor = model(
    'ExerciseModelConstructor',
    ExerciseSchema
);

const createUserName = (username_input) => {
    let user = new UserNameConstructor({
        username: username_input,
    });

    user.save();
    return user;
};

const addExerciseToDatabase = (name, desc, duration, date, id) => {
    let exercise = new ExerciseModelConstructor({
        username: name,
        description: desc,
        duration: duration,
        date: date ? new Date(date) : new Date(),
        user_id: id,
    });

    exercise.save();

    return exercise;
};

app.use(cors());
app.use(express.static('public'));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

app.use(express.urlencoded({ extended: true }));

app.get('/api/users', async (req, res) => {
    const users = await UserNameConstructor.find({}).select('_id username');
    if (!users) {
        res.send('No users');
    } else {
        res.json(users);
    }
});

app.post('/api/users', (req, res) => {
    const username = req.body.username;
    const user_data = createUserName(username);
    res.json({ username: username, _id: user_data._id });
});

app.post('/api/users/:_id/exercises', async (req, res) => {
    const name = await UserNameConstructor.findById(req.params._id);
    if (name) {
        const elements = req.body;
        const exercise_data = addExerciseToDatabase(
            name.username,
            elements.description,
            elements.duration,
            elements.date,
            name._id
        );

        res.json({
            _id: exercise_data.user_id,
            username: exercise_data.username,
            date: exercise_data.date.toDateString(),
            duration: exercise_data.duration,
            description: exercise_data.description,
        });
    } else {
        res.send('No user with this id in the database!');
    }
});

app.get('/api/users/:_id/logs', async (req, res) => {
    const { from, to, limit } = req.query;
    const id = req.params._id;
    const user = await UserNameConstructor.findById(id);
    if (!user) {
        res.send('No users');
        return;
    }
    let dateObj = {};
    if (from) {
        dateObj['$gte'] = new Date(from);
    }
    if (to) {
        dateObj['$lte'] = new Date(to);
    }
    let filter = {
        user_id: id,
    };
    if (from || to) {
        filter.date = dateObj;
    }

    const exercises = await ExerciseModelConstructor.find(filter).limit(
        +limit ?? 500
    );

    const log = exercises.map((e) => ({
        description: e.description,
        duration: e.duration,
        date: e.date.toDateString(),
    }));

    res.json({
        username: user.username,
        count: exercises.length,
        _id: user._id,
        log: log,
    });
});

const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port);
});
