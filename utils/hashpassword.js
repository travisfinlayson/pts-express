const bcrypt = require('bcrypt');

bcrypt.hash('ComputerPTS3!', 10).then((hashedPassword) => {
    console.log(hashedPassword);  // Copy this hashed password
});
