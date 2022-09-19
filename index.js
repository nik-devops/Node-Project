const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors')

const  app = express();

const HttpError = require('./common/model/http-error');
const errorHandle = require('./common/middelware/errorHandle');
const config = require('./common/config/config');
const userRoutes = require('./User/routes/user-routes');
const projectRoutes = require('./Project/routes/project-routes');
const credentialRoutes = require('./Credential/routes/credential-routes');

app.use(express.json());
app.use(cors());
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');

    next();
});


app.use('/api/user',userRoutes);
app.use('/api/project',projectRoutes);
app.use('/api/credential',credentialRoutes);


app.use((req,res,next)=>{
    const error = new HttpError('Could not find this route',404);
    return next(error);
});

app.use(errorHandle);

const port = process.env.port || config.port;

mongoose.connect('mongodb+srv://database_user:ydG87H9d6bme23ZN2B@cluster0.jaxrn.mongodb.net/passwordkeeper?retryWrites=true&w=majority')
          .then(()=>{
              console.log('Connected to DB');
              app.listen(port);
              console.log(`Listening on ${port}`);
          })
          .catch((err)=>{
              console.log(err);
          });
          let a ="";
          console.log(a);