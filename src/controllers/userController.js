const userModel = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const {
  isValid,
  isValidObjectId,
  isValidRequestBody,
  isValidFiles,
} = require("../middleware/validator");
const { uploadFile } = require("../aws/aws");

const createUser = async function (req, res) {
  try {
    //reading input
    let body = req.body;
    let arr = Object.keys(body); //array of object keys

    //empty request body
    if (arr.length == 0) {
      return res
        .status(400)
        .send({ status: false, message: "Please provide input" });
    }

    //mandatory fields
    if (!body.fname) {
      {
        return res
          .status(400)
          .send({ status: false, message: "Please provide fname" });
      }
    }

    if (!body.lname) {
      {
        return res
          .status(400)
          .send({ status: false, message: "Please provide lname" });
      }
    }

    if (!body.email) {
      {
        return res
          .status(400)
          .send({ status: false, message: "Please provide email" });
      }
    }

    // if (!body.profileImage) {
    //   {
    //     return res
    //       .status(400)
    //       .send({ status: false, message: "Please provide profileImage" });
    //   }
    // }

    if (!body.phone) {
      {
        return res
          .status(400)
          .send({ status: false, message: "Please provide phone" });
      }
    }

    if (!body.password) {
      {
        return res
          .status(400)
          .send({ status: false, message: "Please provide password" });
      }
    }

    if (!body.address) {
      {
        return res
          .status(400)
          .send({ status: false, message: "Please provide address" });
      }
    }

    if (body.address) {
      const address = JSON.parse(body.address);
      body.address = address;
      if (!address.shipping.street) {
        {
          return res
            .status(400)
            .send({ status: false, message: "Please provide street" });
        }
      }

      if (!address.shipping.city) {
        {
          return res
            .status(400)
            .send({ status: false, message: "Please provide city" });
        }
      }

      if (!address.shipping.pincode) {
        {
          return res
            .status(400)
            .send({ status: false, message: "Please provide pincode" });
        }
      }

      let shippingPincode = /^[0-9]{6,6}$/.test(address.shipping.pincode);

      if (!shippingPincode) {
        return res
          .status(400)
          .send({ status: false, message: "Please provide a valid pincode " });
      }

      if (!address.billing.street) {
        {
          return res
            .status(400)
            .send({ status: false, message: "Please provide street" });
        }
      }

      if (!address.billing.city) {
        {
          return res
            .status(400)
            .send({ status: false, message: "Please provide city" });
        }
      }

      if (!address.billing.pincode) {
        {
          return res
            .status(400)
            .send({ status: false, message: "Please provide pincode" });
        }
      }

      let billingPincode = /^[0-9]{6,6}$/.test(address.billing.pincode);

      if (!billingPincode) {
        return res
          .status(400)
          .send({ status: false, message: "Please provide a valid pincode " });
      }
    }

    //format validation using regex
    let fname = /^[a-zA-Z]{2,30}$/.test(body.name);
    let lname = /^[a-zA-Z]{2,30}$/.test(body.name);
    let emailId = /^[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,4}$/.test(body.email);
    let password =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,15}$/.test(
        body.password
      );
    //valid indian phone number
    let phone = /^(\+91[\-\s]?)?[0]?(91)?[6789]\d{9}$/.test(body.phone);

    if (!fname) {
      return res
        .status(400)
        .send({ status: false, message: "Please provide a valid fname " });
    }

    if (!lname) {
      return res
        .status(400)
        .send({ status: false, message: "Please provide a valid lname " });
    }

    if (!emailId) {
      return res
        .status(400)
        .send({ status: false, message: "Please provide a valid emailId " });
    }

    if (!password) {
      return res.status(400).send({
        status: false,
        message:
          "Please provide a valid password - Password should include atleast one special character, one uppercase, one lowercase, one number and should be b/w 8-15 characters",
      });
    }

    if (!phone) {
      return res.status(400).send({
        status: false,
        message: "Please provide a valid indian phone number ",
      });
    }

    //unique key validation
    let checkEmail = await userModel.findOne({ email: body.email });
    if (checkEmail) {
      return res.status(400).send({
        status: false,
        message: `${body.email} already exist use different email`,
      });
    }
    let checkPhone = await userModel.findOne({ phone: body.phone });
    if (checkPhone) {
      return res.status(400).send({
        status: false,
        message: `${body.phone} already exist use different phone number`,
      });
    }

    //encrypt password
    let securePassword = body.password;

    const encryptedPassword = async function (securePassword) {
      const passwordHash = await bcrypt.hash(securePassword, 10);
      body.password = passwordHash;
    };
    encryptedPassword(securePassword);

    //-----------------upload profileImage---------------------

    let files = req.files;
    if (files && files.length > 0) {
      //upload to s3 and get the uploaded link
      // res.send the link back to frontend/postman
      let uploadedFileURL = await uploadFile(files[0]); //upload file
      body.profileImage = uploadedFileURL;
    } else {
      return res
        .status(400)
        .send({ status: false, message: "please upload profile image" });
    }

    //create body
    let userCreated = await userModel.create(body);
    res.status(201).send({
      status: true,
      message: "User created successfully",
      data: userCreated,
    });
  } catch (error) {
    res.status(500).send({
      status: false,
      Error: "Server not responding",
      message: error.message,
    });
  }
};

const login = async function (req, res) {
  try {
    let body = req.body;
    const { email, password } = body;
    if (!isValidRequestBody(body)) {
      return res
        .status(400)
        .send({ status: false, message: "pls provide details to login" });
    }

    if (!isValid(email)) {
      return res
        .status(400)
        .send({ status: false, message: "pls provide valid email" });
    }
    // regex validation for email

    if (!/^\w+([\.-]?\w+)@\w+([\.-]?\w+)(\.\w{2,3})+$/.test(email)) {
      return res.status(400).send({
        status: false,
        message: `${email} should be a valid email address`,
      });
    }

    if (!isValid(password)) {
      return res
        .status(400)
        .send({ status: false, message: "pls provide valid password" });
    }

    // regex validation for passwrd

    if (!/^[a-zA-Z0-9!@#$%^&*]{8,15}$/.test(password)) {
      return res.status(400).send({
        status: false,
        message: `Password length should be A Valid Password And Length Should Be in between 8 to 15 `,
      });
    }

    let user = await userModel.findOne({ email: email });
    if (!user) {
      return res
        .status(400)
        .send({ status: false, msg: "Invalid credentials" });
    }
    const passwordDetails = await bcrypt.compare(body.password, user.password);
    if (!passwordDetails) {
      return res.status(400).send({
        status: false,
        message: "password is incorrect pls provide correct passwords",
      });
    }
    // after sucessfully enter email and password ,create a token

    const token = jwt.sign(
      {
        userId: user._id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 180,
      },
      "Group-48"
    );
    return res.status(200).send({
      status: true,
      message: "User login successfull",
      data: { userId: user._id, token: token },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ status: false, msg: error.message });
  }
};

const getUser = async function (req, res) {
  try {
    const params = req.params;
    const userId = params.userId;

    if (!userId) {
      res
        .status(400)
        .send({ status: false, message: "please enter UserId in params" });
    }

    if (!isValidObjectId(userId)) {
      return res
        .status(400)
        .send({ status: false, message: "userId is incorrect" });
    }

    const user = await userModel.findOne({ _id: userId, isDeleted: false });
    if (!user) {
      return res.status(404).send({
        status: false,
        message: `User did not found with this ${userId} id`,
      });
    }
    res
      .status(200)
      .send({ status: true, message: "User profile details", data: user });
  } catch (error) {
    console.log({ status: false, message: error.message });
    res.status(500).send({ status: false, message: error.message });
  }
};

const updateUser = async function (req, res) {
  try {
    let userId = req.params.userId;

    let data = req.body;

    //...authorization....//

    if (!(userId === req.userId)) {
      return res
        .status(402)
        .send({ status: false, message: " Unauthorized access" });
    }

    const files = req.files;

    if (isValidFiles(files)) {
      const profilePicture = await uploadFile(files[0]);

      data.profileImage = profilePicture;
    }

    const isEmailAlreadyExist = await userModel.findOne({ email: data.email });

    if (isEmailAlreadyExist) {
      return res
        .status(400)
        .send({ status: false, message: `${email} is already exist` });
    }

    const isPhoneAlreadyExist = await userModel.findOne({ phone: data.phone });

    if (isPhoneAlreadyExist) {
      return res
        .status(400)
        .send({ status: false, message: `${phone} is already exist` });
    }

    const updatedUser = await userModel.findOneAndUpdate(
      { _id: userId },
      data,
      { new: true }
    );

    return res.status(200).send({
      status: true,
      message: "User profile updated",
      data: updatedUser,
    });
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};

module.exports = { createUser, getUser, login, updateUser };