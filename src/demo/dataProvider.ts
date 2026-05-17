import fakeRestDataProvider from "ra-data-fakerest";
import generateData from "data-generator-retail";
import type { DataProvider } from "ra-core";
import { customersDataProvider } from "./api/customersDataProvider";
import { activityLogsDataProvider } from "./api/activityLogsDataProvider";
import { postsDataProvider } from "./api/postsDataProvider";
import { commentsDataProvider } from "./api/commentsDataProvider";

const fakeData = generateData();
const fakeProvider = fakeRestDataProvider(fakeData, true, 500);

export const dataProvider: DataProvider = {
  ...fakeProvider,
  getList: (resource, params) => {
    if (resource === "customers") return customersDataProvider.getList(resource, params);
    if (resource === "activity-logs") return activityLogsDataProvider.getList(resource, params);
    if (resource === "posts") return postsDataProvider.getList(resource, params);
    if (resource === "comments") return commentsDataProvider.getList(resource, params);
    return fakeProvider.getList(resource, params);
  },

  getOne: (resource, params) => {
    if (resource === "customers") return customersDataProvider.getOne(resource, params);
    if (resource === "posts") return postsDataProvider.getOne(resource, params);
    if (resource === "comments") return commentsDataProvider.getOne(resource, params);
    return fakeProvider.getOne(resource, params);
  },

  update: (resource, params) => {
    if (resource === "customers") return customersDataProvider.update(resource, params);
    if (resource === "posts") return postsDataProvider.update(resource, params);
    return fakeProvider.update(resource, params);
  },

  delete: (resource, params) => {
    if (resource === "posts") return postsDataProvider.delete(resource, params);
    if (resource === "comments") return commentsDataProvider.delete(resource, params);
    return fakeProvider.delete(resource, params);
  },

  getMany: (resource, params) =>
    resource === "customers"
      ? customersDataProvider.getMany(resource, params)
      : fakeProvider.getMany(resource, params),
};
