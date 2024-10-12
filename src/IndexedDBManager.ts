interface PageData {
    id?: number; // 主键，自增
    domain: string; // 页面域名
    url: string; // 页面完整 URL
    favicon: string; // 页面 favicon
    duration: string; // 页面使用时长
    startTime: number; // 页面展示开始时间
    endTime: number; // 页面展示结束时间
}

interface DeleteCriteria {
    id?: number;
    domain?: string;
    url?: string;
    startTime?: number;
    endTime?: number;
}

interface QueryCriteria {
    id?: number;
    domain?: string;
    url?: string;
    startTime?: number;
    endTime?: number;
}

// 内部函数：通过 ID 查询
const _getById = (id: number, store: IDBObjectStore): Promise<any> => {
    return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => {
            resolve(request.result ? [request.result] : []);
        };
        request.onerror = (event: Event) => {
            reject(new Error('Failed to get data: ' + (event.target as IDBRequest).error));
        };
    });
};

// 内部函数：通过域名查询
const _getByDomain = (domain: string, store: IDBObjectStore): Promise<any> => {
    return new Promise((resolve, reject) => {
        const index = store.index('domain');
        const request = index.getAll(domain);
        request.onsuccess = () => {
            resolve(request.result || []);
        };
        request.onerror = (event: Event) => {
            reject(new Error('Failed to get data: ' + (event.target as IDBRequest).error));
        };
    });
};

// 内部函数：通过 URL 查询
const _getByUrl = (url: string, store: IDBObjectStore): Promise<any> => {
    return new Promise((resolve, reject) => {
        const index = store.index('url');
        const request = index.getAll(url);
        request.onsuccess = () => {
            resolve(request.result || []);
        };
        request.onerror = (event: Event) => {
            reject(new Error('Failed to get data: ' + (event.target as IDBRequest).error));
        };
    });
};

// 内部函数：通过时间范围查询
const _getByTimeRange = (timeRange: {
    startTime?: number, 
    endTime?: number
}, store: IDBObjectStore): Promise<PageData[]> => {
    return new Promise((resolve, reject) => {
        const results: PageData[] = [];
        const { startTime, endTime } = timeRange;

        let cursorRequest;

        // 根据条件选择索引和范围
        if (startTime !== undefined && endTime !== undefined) {
            // 如果两个条件都存在，使用 startTimeIndex 作为主索引
            const startIndex = store.index('startTime');
            cursorRequest = startIndex.openCursor(IDBKeyRange.bound(startTime, Infinity));
        } else if (startTime !== undefined) {
            // 仅根据 startTime 筛选
            const startIndex = store.index('startTime');
            cursorRequest = startIndex.openCursor(IDBKeyRange.lowerBound(startTime));
        } else if (endTime !== undefined) {
            // 仅根据 endTime 筛选
            const endIndex = store.index('endTime');
            cursorRequest = endIndex.openCursor(IDBKeyRange.upperBound(endTime));
        } else {
            // 没有条件，直接获取所有记录
            cursorRequest = store.openCursor();
        }

        cursorRequest.onsuccess = (event: Event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
                const value = cursor.value;

                if (
                    (!startTime || value.startTime >= startTime) &&
                    (!endTime || value.endTime <= endTime)
                ) {
                    results.push(value); // 添加符合条件的记录
                }

                cursor.continue(); // 继续遍历
            } else {
                // 遍历完成，返回结果
                resolve(results); // 将符合条件的结果作为 Promise 结果返回
            }
        };

        cursorRequest.onerror = (event: Event) => {
            reject(new Error('Failed to get data: ' + (event.target as IDBRequest).error));
        };
    });
};

class IndexedDBManager {
    private dbName: string; // 数据库名称
    private db: IDBDatabase | null = null; // 数据库实例

    constructor(dbName: string) {
        this.dbName = dbName; // 初始化数据库名称
    }

    // 打开数据库
    async open(version: number = 1): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, version);

            // 数据库升级时的处理
            request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
                this.db = (event.target as IDBOpenDBRequest).result;

                // 创建对象存储，设置自增主键
                const store = this.db.createObjectStore('pages', { keyPath: 'id', autoIncrement: true });

                // 创建索引，支持通过域名和 URL 查询
                store.createIndex('domain', 'domain', { unique: false });
                store.createIndex('url', 'url', { unique: false });
                store.createIndex('startTime', 'startTime', { unique: false }); // 添加 startTime 索引
                store.createIndex('endTime', 'endTime', { unique: false }); // 添加 endTime 索引
            };

            // 数据库打开成功
            request.onsuccess = (event: Event) => {
                this.db = (event.target as IDBOpenDBRequest).result;
                resolve(this.db);
            };

            // 数据库打开失败
            request.onerror = (event: Event) => {
                reject(new Error('Failed to open database: ' + (event.target as IDBOpenDBRequest).error));
            };
        });
    }

    // 查询数据，支持通过 ID、域名、URL 和时间范围查询
    async getData(criteria: QueryCriteria): Promise<PageData[]> {
        return new Promise(async (resolve, reject) => {
            try {
                const transaction = this.db!.transaction('pages', 'readonly');
                const store = transaction.objectStore('pages');
                const results: PageData[] = []; // 存储查询结果

                // 根据查询条件调用相应的内部函数
                if (criteria.id) {
                    results.concat(await _getById(criteria.id, store));
                } else if (criteria.domain) {
                    results.concat(await _getByDomain(criteria.domain, store));
                } else if (criteria.url) {
                    results.concat(await _getByUrl(criteria.url, store));
                } else if (criteria.startTime || criteria.endTime) {
                    results.concat(await _getByTimeRange(
                        {
                            startTime: criteria.startTime,
                            endTime: criteria.endTime,
                        }, 
                        store,
                    ));
                }

                resolve(
                    results.filter(item => {
                        if (
                            // id 条件过滤
                            (criteria.id && item.id !== criteria.id)
                            // 域名条件过滤
                            || (criteria.domain && item.domain !== criteria.domain)
                            // URL 条件过滤
                            || (criteria.url && item.url !== criteria.url)
                            // 时间范围条件过滤
                            || (criteria.startTime && item.startTime! < criteria.startTime) 
                            || (criteria.endTime && item.endTime! > criteria.endTime)
                        ) {
                            return false;
                        } 

                        return true;
                    })
                );
            } catch (error) {
                reject(new Error('Failed to get data: ' + error));
            }
        });
    }

    // 添加数据，支持单条添加
    async addData(data: PageData | PageData[]): Promise<void> {
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction('pages', 'readwrite');
            const store = transaction.objectStore('pages');
            const request = store.add(data);

            request.onsuccess = () => {
                // TODO m 需要验证 是这样获取 id 的吗
                const generatedId = request.result; // 获取生成的 ID
                resolve(generatedId);
            };

            request.onerror = (event: Event) => {
                reject(new Error('Failed to add data: ' + (event.target as IDBRequest).error));
            };
        });
    }

    // 删除数据，支持通过 ID、域名、URL 和时间范围删除
    async deleteData(criteria: DeleteCriteria): Promise<void> {
        const transaction = this.db!.transaction('pages', 'readwrite');
        const store = transaction.objectStore('pages');

        const requests: Promise<void>[] = []; // 存储删除请求

        // 通过 ID 删除
        if (criteria.id) {
            requests.push(store.delete(criteria.id).then(() => { }));
        }

        // 通过域名删除
        if (criteria.domain) {
            const index = store.index('domain');
            const query = index.getAll(criteria.domain);
            query.onsuccess = () => {
                query.result.forEach(item => {
                    requests.push(store.delete(item.id!).then(() => { })); // 使用非空断言
                });
            };
        }

        // 通过 URL 删除
        if (criteria.url) {
            const index = store.index('url');
            const query = index.getAll(criteria.url);
            query.onsuccess = () => {
                query.result.forEach(item => {
                    requests.push(store.delete(item.id!).then(() => { })); // 使用非空断言
                });
            };
        }

        // 通过时间范围删除
        if (criteria.startTime || criteria.endTime) {
            const query = store.openCursor();
            query.onsuccess = (event: Event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    const { startTime, endTime } = cursor.value;

                    // 根据时间范围条件删除
                    const withinStartTime = !criteria.startTime || startTime >= criteria.startTime;
                    const withinEndTime = !criteria.endTime || endTime <= criteria.endTime;

                    if (withinStartTime && withinEndTime) {
                        requests.push(store.delete(cursor.value.id!).then(() => { })); // 使用非空断言
                    }

                    cursor.continue(); // 继续遍历
                }
            };
        }

        // 执行所有删除请求
        Promise.all(requests).then(() => { }).catch((error) => {
            throw new Error('Failed to delete data: ' + error);
        });
    }

    // 更新数据，支持通过 ID 修改
    async updateData(id: number, updates: Partial<PageData>): Promise<void> {
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction('pages', 'readwrite');
            const store = transaction.objectStore('pages');

            const getRequest = store.get(id);
            getRequest.onsuccess = (event: Event) => {
                const data = (event.target as IDBRequest).result;
                if (data) {
                    Object.assign(data, updates); // 合并更新数据
                    const updateRequest = store.put(data);
                    updateRequest.onsuccess = () => {
                        resolve();
                    };
                    updateRequest.onerror = (event: Event) => {
                        reject(new Error('Failed to update data: ' + (event.target as IDBRequest).error));
                    };
                } else {
                    reject(new Error('Data not found'));
                }
            };
        });
    }
}
