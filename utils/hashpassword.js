const bcrypt = require('bcrypt');

bcrypt.hash('PTS123!@#', 10).then((hashedPassword) => {
    console.log(hashedPassword);  // Copy this hashed password
});
