function handleSubmit(event) {
  event.preventDefault();

  const location = document.getElementById('location').value;
  const dateValue = document.getElementById('date').value;
  const date = new Date(document.getElementById('date').value);
  const today = new Date();
  const daysLeft = Math.round((date - today) / (24 * 60 * 60 * 1000));

  if (!location || !dateValue || daysLeft < 0) {
    alert('Please, fill both fields with valid information');
    return;
  }

  const locationQuery = location
    .split(',')
    .map((l) => l.trim())
    .join('+');

  postData('http://localhost:8081/base', {
    location,
    dateValue,
    daysLeft,
  }).then(() => {
    getData(
      `https://pixabay.com/api/?key=15981019-602df5061e142303589608af5&q=${locationQuery}`
    ).then((data) => {
      const imgSrc = data.hits[0].webformatURL;

      postData('http://localhost:8081/pixabay', { imgSrc });
    });

    getData(
      `http://api.geonames.org/postalCodeSearchJSON?placename=${locationQuery}&username=snowi`
    ).then((data) => {
      const latitude = data.postalCodes[0].lat;
      const longitude = data.postalCodes[0].lng;

      if (!daysLeft) {
        console.log('date === today');
        getData(
          `https://api.weatherbit.io/v2.0/current?lat=${latitude}&lon=${longitude}&key=349f7b9de5b24fb281f638662d60eeb8`
        ).then((data) => {
          const temperature = data.data[0].temp;
          const description = data.data[0].weather.description;

          postData('http://localhost:8081/weatherbit', {
            temperature,
            description,
          }).then(() => {
            updateUI();
          });
        });
      } else {
        console.log('date !== today');
        getData(
          `https://api.weatherbit.io/v2.0/forecast/daily?lat=${latitude}&lon=${longitude}&key=349f7b9de5b24fb281f638662d60eeb8`
        ).then((data) => {
          const daysList = data.data;
          const dayData = daysList.find((day) => day.valid_date === dateValue);
          let temperature;
          let description;

          if (!dayData) {
            console.log('too far');
            temperature = daysList[15].temp;
            description = daysList[15].weather.description;
          } else {
            console.log('before 2 weeks');
            temperature = dayData.temp;
            description = dayData.weather.description;
          }

          postData('http://localhost:8081/weatherbit', {
            temperature,
            description,
          }).then(() => {
            updateUI();
          });
        });
      }
    });
  });
}

const postData = async (url = '', data = {}) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  try {
    const newData = await response.json();
    return newData;
  } catch (error) {
    console.log('Error: ', error);
  }
};

const getData = async (url) => {
  const response = await fetch(url);

  try {
    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.log('Error: ', error);
  }
};

const updateUI = async () => {
  const request = await fetch('http://localhost:8081/all');

  try {
    const allData = await request.json();

    const tripsPlaceholder = document.getElementById('trips-placeholder');

    const template = `
    <article>
      <div class="image-container">
        <img src="${allData.imgSrc}"/>
        <a
          class="text-s"
          href="https://pixabay.com/"
          target="_blank"
          rel="noopener"
        >
          Pixabay - Free Images
        </a>
      </div>
      <div class="card-content">
        <p class="text-l">My trip to: ${allData.location}</p>
        <p class="text-l">Departing: ${allData.dateValue}</p>
        <div class="buttons-container">
          <button class="text-m button-save">save trip</button>
          <button class="text-m button-remove">remove trip</button>
        </div>
        <p class="text-m">${allData.location} is ${allData.daysLeft} days away</p>
        <div class="weather-container">
          <p class="text-m">Typical weather for then is:</p>
          <p class="text-s">Temperature - ${allData.temperature}</p>
          <p class="text-s">${allData.description}</p>
        </div>
      </div>
    </article>
    `;

    tripsPlaceholder.innerHTML = template;
  } catch (error) {
    console.log('Error: ', error);
  }
};

export { handleSubmit };
