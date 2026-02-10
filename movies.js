import movies from "./data/movies.json" with { type: "json" };

movies.forEach((movie, i) => {
  movie.id = `${i + 1}`;
});

let data = movies;

function create(movie) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newMovie = { id: `${movies.length + 1}`, ...movie };
      data.push(newMovie);
      resolve(newMovie);
    }, Math.random() * 1000);
  });
}

function find() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(data);
    }, Math.random() * 1000);
  });
}

function findById(id) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(data.find((movie) => movie.id === id));
    }, Math.random() * 1000);
  });
}

function findByIdAndUpdate(id, update) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const movie = data.find((movie) => movie.id === id);

      if (!movie) {
        resolve(null);
        return;
      }
      Object.assign(movie, update);
      resolve(movie);
    }, Math.random() * 1000);
  });
}

function findByIdAndDelete(id) {
  return new Promise((resolve) => {
    setTimeout(() => {
      data = data.filter((movie) => movie.id !== id);
      resolve();
    }, Math.random() * 1000);
  });
}

export default { create, find, findById, findByIdAndUpdate, findByIdAndDelete };
