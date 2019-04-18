export default (fn: any, { delay = 50 } = {}) => {
  let totalWait = 0;

  return new Promise((resolve, reject) => {
    const check = () => {
      totalWait += delay;

      setTimeout(async () => {
        try {
          const result = await fn(totalWait);
          result ? resolve(result) : check();
        } catch (e) {
          reject(e);
        }
      }, delay);
    };
    check();
  });
};
