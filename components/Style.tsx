import React from "react";

const Style = () => {
  return (
    <style>{`
      body {
        margin: 0;
        padding: 16px 0px 0px 0px;
        display: flex;
        flex-direction: column;
        align-items: center;
        font-family: Arial, sans-serif;
        background-color: #FEEFFF; /* Light gray background */
      }
      h1 {
        color: #333; /* Dark gray text for the heading */
        margin-top: 16px;
        text-align: center; /* Center text */
      }
      h6 {
        margin: 16px;
        text-align: center;
      }
      div {
        width: 90%; /* Responsive width */
        max-width: 600px; /* Maximum width */
        margin: 10px auto; /* Centering and spacing between elements */
      }
      img,
      audio,
      video {
        width: 100%; /* Full width of the container */
      }
    

      .mono {
        font-family: monospace;
        font-size: 0.64rem;
        text-align: center;
        text-overflow: ellipsis;
      }
    `}</style>
  );
};

export default Style;
