import UserPreference from "../models/user-preference.model.js";
import mongoose from "mongoose";

const find = (filter = {}, options = {}) => {
  return UserPreference.find(filter, null, options);
};

const findOne = async (filter = {}, options = {}) => {
  return UserPreference.findOne(filter, null, options);
};

const findById = async (id, lean = false) => {
  const query = UserPreference.findById(id);
  if (lean) return query.lean();
  return query;
};

const create = async (data) => {
  return UserPreference.create(data);
};

const findByIdAndUpdate = async (id, updateData, options = {}) => {
  return UserPreference.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
    ...options,
  });
};

const findByIdAndDelete = async (id) => {
  return UserPreference.findByIdAndDelete(id);
};

const findOneAndUpdate = async (filter, updateData, options = {}) => {
  return UserPreference.findOneAndUpdate(filter, updateData, {
    new: true,
    runValidators: true,
    upsert: false,
    ...options,
  });
};

const deleteMany = async (filter) => {
  return UserPreference.deleteMany(filter);
};

const getUserPreferences = async (userId) => {
  return UserPreference.find({
    userId,
    isDeleted: false,
  })
    .populate("categoryId", "name img_sqr img_rec video_sqr video_rec status isPremium imageCount prompt")
    .sort({ createdAt: 1 })
    .lean();
};

const bulkWrite = async (operations, options = {}) => {
  return UserPreference.bulkWrite(operations, options);
};

export default {
  find,
  findOne,
  findById,
  create,
  findByIdAndUpdate,
  findByIdAndDelete,
  findOneAndUpdate,
  deleteMany,
  getUserPreferences,
  bulkWrite,
};

