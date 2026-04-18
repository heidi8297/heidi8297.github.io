const Quote = ({ text, authorName, authorTitle }) => {
  return (

    <div class="carousel-item container-fluid">
        <h1 class="quote">“</h1>
        <h4 class="testimonial-text">{text}</h4>
        <em class="testimonial-author">-{authorName}, {authorTitle}</em>
    </div>
  );
};

export default Quote;