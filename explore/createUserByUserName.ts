import { createUserByLastfmUsername } from "../src/users/users.service";

const usernames = process.argv.slice(2);

if (usernames.length === 0) {
  console.log("Missing usernames");
  process.exit(1);
}

usernames.forEach((username) => {
  createUserByLastfmUsername(username)
    .then((user) => {
      console.log("Created user", user);
    })
    .catch((error) => {
      console.error(error);
    });
});
