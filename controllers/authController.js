const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs/promises");
const Jimp = require("jimp");
const { User } = require("../db/UserModel");
const gravatar = require("gravatar");
const path = require("path");
const { HttpError, ctrlWrapper } = require("../helpers");
// require("dotenv").config();
const { SECRET_KEY } = process.env;

// const register = async (req, res) => {

//   const { email, password } = req.body;
//   const user = await User.findOne({ email });
//   if (user) {
//     throw HttpError(409, "Email in use");
//   }

//   const hashPassword = await bcrypt.hash(password, 10);

//   const newUser = await User.create({
//     ...req.body,
//     password: hashPassword,
//     avatarURL: gravatar.url(email, { protocol: "http", s: "100" }),
//   });

//   res.status(201).json({
//     name: newUser.name,
//     email: newUser.email,
//   });
// };

const register = async (req, res) => {
  console.log("body", req.body);
  console.log("file", req.file);
  const { email, password } = req.body;
  let avatarURL = "";
  const avatarDir = path.join(__dirname, "../", "public", "avatars");

  if (req.file) {
    const { path: tempUpload, filename } = req.file;
    Jimp.read(tempUpload)
      .then((avatar) => {
        return avatar
          .resize(250, 250) // resize
          .quality(60) // set JPEG quality
          .write(tempUpload); // save
      })
      .catch((err) => {
        console.error(err);
      });

    const resultUpload = path.join(avatarDir, filename);
    await fs.rename(tempUpload, resultUpload);
    avatarURL = path.join("avatars", filename);
    console.log("avatarURL", avatarURL);
  } else {
    avatarURL = gravatar.url(email, { protocol: "http", s: "250" });
    console.log("avatarURL", avatarURL);
  }

  const user = await User.findOne({ email });
  if (user) {
    throw HttpError(409, "Email in use");
  }

  const hashPassword = await bcrypt.hash(password, 10);

  const newUser = await User.create({
    ...req.body,
    password: hashPassword,
    avatarURL: avatarURL,
  });

  res.status(201).json({
    name: newUser.name,
    email: newUser.email,
  });
};
const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    throw HttpError(401, "Email or password invalid"); // "Email invalid"
  }

  const passwordCompare = await bcrypt.compare(password, user.password);
  if (!passwordCompare) {
    throw HttpError(401, "Email or password invalid"); // "Password invalid"
  }

  const payload = {
    id: user._id,
  };

  const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "23h" });
  await User.findByIdAndUpdate(user._id, { token });
  //   const decodeToken = jwt.decode(token);
  //   console.log("decodeToken", decodeToken);
  //   try {
  //     const result = jwt.verify(token, SECRET_KEY);
  //     console.log(result);
  //   } catch (error) {
  //     console.log(error.message);
  //   }

  res.json({
    token,
    name: user.name,
    email: user.email,
  });
};

const getCurrent = async (req, res) => {
  const { email, name } = req.user;

  res.json({
    email,
    name,
  });
};

const logout = async (req, res) => {
  const { _id } = req.user;
  await User.findByIdAndUpdate(_id, { token: "" });

  res.json({
    message: "Logout success",
  });
};

const subscriptionUpdate = async (req, res) => {
  const { _id } = req.user;
  const { subscription } = req.body;
  console.log("subscription", subscription);
  await User.findByIdAndUpdate(_id, { subscription: subscription });

  res.json({
    message: ` Subscription successfuly changed to ${subscription}`,
  });
};
const avatarUpdate = async (req, res) => {
  const { _id } = req.user;
  let avatarURL = "";
  const avatarDir = path.join(__dirname, "../", "public", "avatars");

  // if (!req.file) {
  // }
  const { path: tempUpload, filename } = req.file;
  Jimp.read(tempUpload)
    .then((avatar) => {
      return avatar
        .resize(250, 250) // resize
        .quality(60) // set JPEG quality
        .write(tempUpload); // save
    })
    .catch((err) => {
      console.error(err);
    });

  const resultUpload = path.join(avatarDir, filename);

  try {
    await fs.rename(tempUpload, resultUpload);
  } catch (err) {
    await fs.unlink(tempUpload);
    console.error(err);
  }
  avatarURL = path.join("avatars", filename);
  console.log("avatarURL", avatarURL);

  await User.findByIdAndUpdate(_id, { avatarURL: avatarURL });

  res.json({
    avatarURL: avatarURL,
    message: ` Avatar successfuly updated`,
  });
};

module.exports = {
  register: ctrlWrapper(register),
  login: ctrlWrapper(login),
  getCurrent: ctrlWrapper(getCurrent),
  logout: ctrlWrapper(logout),
  subscriptionUpdate: ctrlWrapper(subscriptionUpdate),
  avatarUpdate: ctrlWrapper(avatarUpdate),
};
