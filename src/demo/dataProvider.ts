import fakeRestDataProvider from "ra-data-fakerest";
import generateData from "data-generator-retail";
import type { DataProvider } from "ra-core";
import { customersDataProvider } from "./api/customersDataProvider";
import { activityLogsDataProvider } from "./api/activityLogsDataProvider";
import { postsDataProvider } from "./api/postsDataProvider";
import { commentsDataProvider } from "./api/commentsDataProvider";
import { isDemoNumericId, isUuid } from "./api/idUtils";

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
    if (resource === "customers") {
      if (isDemoNumericId(params.id)) {
        return fakeProvider.getOne(resource, params);
      }
      return customersDataProvider.getOne(resource, params);
    }
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

  getMany: (resource, params) => {
    if (resource !== "customers") {
      return fakeProvider.getMany(resource, params);
    }

    const ids = params.ids;
    const uuidIds = ids.filter(isUuid);
    const demoIds = ids.filter(isDemoNumericId);

    if (demoIds.length > 0 && uuidIds.length === 0) {
      return fakeProvider.getMany(resource, params);
    }
    if (uuidIds.length > 0 && demoIds.length === 0) {
      return customersDataProvider.getMany(resource, { ...params, ids: uuidIds });
    }
    if (uuidIds.length === 0) {
      return Promise.resolve({ data: [] });
    }

    return Promise.all([
      customersDataProvider.getMany(resource, { ...params, ids: uuidIds }),
      demoIds.length > 0
        ? fakeProvider.getMany(resource, { ...params, ids: demoIds })
        : Promise.resolve({ data: [] }),
    ]).then(([api, fake]) => ({ data: [...api.data, ...fake.data] }));
  },
};
