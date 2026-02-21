import createError from "http-errors";
import User from "../models/user.model.js";

async function list(req, res) {
  const users = await User.find();
  res.json(users);
}

async function detail(req, res) {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw createError(404, "User not found");
  }

  res.json(user);
}

async function create(req, res) {
  const user = await User.create(req.body);
  res.status(201).json(user);
}

async function update(req, res) {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw createError(404, "User not found");
  }

  Object.assign(user, req.body);
  await user.save();

  res.json(user);
}

async function deleteUser(req, res) {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    throw createError(404, "User not found");
  }

  res.status(204).send();
}

export default { list, detail, create, update, delete: deleteUser };
