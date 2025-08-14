// Simple course loader
// Reads the course id from the URL and renders the corresponding content.

(function () {
  const courses = {
    101: {
      title: 'Investing 101',
      description: 'Discover the basics of stocks, bonds, and how markets work.',
      lessons: [
        'What is a stock and why do companies issue them?',
        'Understanding supply and demand',
        'The role of exchanges and regulators',
        'Overview of other asset classes (bonds, commodities)',
      ],
    },
    102: {
      title: 'Understanding Risk',
      description: 'Learn about diversification, volatility, and risk management.',
      lessons: [
        'Defining risk and return',
        'The importance of diversification',
        'Volatility and standard deviation explained',
        'Building a balanced portfolio',
      ],
    },
    103: {
      title: 'Trading Strategies',
      description: 'Explore different approaches to picking stocks and timing trades.',
      lessons: [
        'Fundamental vs. technical analysis',
        'Long‑term investing vs. day trading',
        'Reading charts and indicators',
        'Developing your own strategy',
      ],
    },
  };
  function getCourseId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  }
  function renderCourse() {
    const courseId = getCourseId();
    const course = courses[courseId];
    const container = document.getElementById('courseContent');
    if (!course) {
      container.innerHTML = '<p>Course not found.</p>';
      return;
    }
    let html = `<h3>${course.title}</h3>`;
    html += `<p>${course.description}</p>`;
    html += '<ul style="list-style: disc inside; margin-top: 1rem;">';
    course.lessons.forEach((lesson) => {
      html += `<li style="margin-bottom: 0.5rem;">${lesson}</li>`;
    });
    html += '</ul>';
    container.innerHTML = html;
  }
  document.addEventListener('DOMContentLoaded', renderCourse);
})();