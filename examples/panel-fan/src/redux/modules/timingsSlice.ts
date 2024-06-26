import {
  addTimingApi,
  fetchTimingsApi,
  updateStatusOrDeleteTimingApi,
  updateTimingApi,
} from '@/api';
import { createAsyncThunk, createEntityAdapter, createSlice, EntityId } from '@reduxjs/toolkit';
import { DEFAULT_TIMING_CATEGORY } from '@/constant';
import moment from 'moment';
import { ReduxState } from '..';
import { kit } from '@ray-js/panel-sdk';

const { getDevInfo } = kit;

type Timer = IAndSingleTime & {
  time: string;
  id: EntityId;
};

type AddTimerPayload = {
  dps: string;
  time: string;
  loops: string;
  actions: any;
  aliasName?: string;
};

const timingsAdapter = createEntityAdapter<Timer>({
  sortComparer: (a, b) => (moment(a.time, 'HH:mm').isBefore(moment(b.time, 'HH:mm')) ? -1 : 1),
});

export const fetchTimings = createAsyncThunk<Timer[]>('timings/fetchTimings', async () => {
  const { timers } = await fetchTimingsApi();

  return timers as unknown as Timer[];
});

export const addTiming = createAsyncThunk<Timer, AddTimerPayload>(
  'timings/addTiming',
  async param => {
    const { groupId: devGroupId, devId } = getDevInfo();
    const defaultParams = {
      bizId: devGroupId || devId,
      bizType: devGroupId ? '1' : '0',
      isAppPush: false,
      category: DEFAULT_TIMING_CATEGORY,
    };
    const params = { ...defaultParams, ...param };
    const id = await addTimingApi(params);
    return { id, status: 1, ...params };
  }
);

export const updateTiming = createAsyncThunk(
  'timings/updateTiming',
  async (param: AddTimerPayload & { id: EntityId }) => {
    const { groupId: devGroupId, devId } = getDevInfo();
    const defaultParams = {
      bizId: devGroupId || devId,
      bizType: devGroupId ? '1' : '0',
      isAppPush: false,
      category: DEFAULT_TIMING_CATEGORY,
    };
    const params = { ...defaultParams, ...param };
    await updateTimingApi(params);
    return { id: param.id, changes: param };
  }
);

export const deleteTiming = createAsyncThunk<EntityId, EntityId>(
  'timings/deleteTiming',
  async id => {
    // status 2 --- 删除
    await updateStatusOrDeleteTimingApi({ ids: String(id), status: 2 });
    return id;
  }
);

export const updateTimingStatus = createAsyncThunk(
  'timings/updateTimingStatus',
  async ({ id, status }: { id: EntityId; status: 0 | 1 }) => {
    // status 0 --- 关闭  1 --- 开启
    await updateStatusOrDeleteTimingApi({ ids: String(id), status });
    return { id, changes: { status: status ?? 0 } };
  }
);

/**
 * Slice
 */
const timingsSlice = createSlice({
  name: 'timings',
  initialState: timingsAdapter.getInitialState(),
  reducers: {},
  extraReducers(builder) {
    builder.addCase(fetchTimings.fulfilled, (state, action) => {
      timingsAdapter.upsertMany(state, action.payload);
    });
    builder.addCase(addTiming.fulfilled, (state, action) => {
      timingsAdapter.upsertOne(state, action.payload);
    });
    builder.addCase(deleteTiming.fulfilled, (state, action) => {
      timingsAdapter.removeOne(state, action.payload);
    });
    builder.addCase(updateTimingStatus.fulfilled, (state, action) => {
      timingsAdapter.updateOne(state, action.payload);
    });
    builder.addCase(updateTiming.fulfilled, (state, action) => {
      timingsAdapter.updateOne(state, action.payload);
    });
  },
});

/**
 * Selectors
 */
const selectors = timingsAdapter.getSelectors((state: ReduxState) => state.timings);
export const {
  selectIds: selectAllTimingIds,
  selectAll: selectAllTimings,
  selectTotal: selectTimingsTotal,
  selectById: selectTimingById,
  selectEntities: selectTimingEntities,
} = selectors;

export default timingsSlice.reducer;
