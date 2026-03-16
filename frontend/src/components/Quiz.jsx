import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Quiz.css";

const TOTAL_QUESTIONS = 3;

function Quiz() {
  const [fetchedData, setFetchedData] = useState([]);
  const [currentQuestionId, setCurrentQuestionId] = useState(1);
  const [selectedOption, setSelectedOption] = useState(null);
  const [quizResponses, setQuizResponses] = useState({
    runtime: 0,
    genre: 0,
    releaseDate: "",
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${import.meta.env.VITE_BACKEND_URL}/questions`)
      .then((response) => response.json())
      .then((data) => {
        setFetchedData(data);
      });
  }, []);

  const currentQuestion = fetchedData.find(
    (question) => question.id === currentQuestionId
  );

  const handleOptionChange = (value) => {
    setSelectedOption(value);
    if (currentQuestionId === 1) {
      setQuizResponses({ ...quizResponses, runtime: value.id });
    } else if (currentQuestionId === 2) {
      setQuizResponses({ ...quizResponses, genre: value.id });
    } else if (currentQuestionId === 3) {
      setQuizResponses({ ...quizResponses, releaseDate: value.value });
    }
  };

  const handleNextQuestion = () => {
    if (selectedOption !== null) {
      setCurrentQuestionId(currentQuestionId + 1);
      setSelectedOption(null);
    }
  };

  function handleShowRandomMovie() {
    if (selectedOption !== null) {
      navigate("/movie", { state: { quizResponses } });
    }
  }

  return (
    <form className="questionaire">
      {currentQuestion != null && (
        <>
          <p className="quiz-progress">
            Question {currentQuestionId}/{TOTAL_QUESTIONS}
          </p>
          <h2 className="Question">{currentQuestion.name}</h2>
          <ul>
            {currentQuestion.options.map((option) => (
              <li key={option.id}>
                <input
                  type="radio"
                  id={option.id}
                  name={`question-${currentQuestion.id}`}
                  value={option.value}
                  onChange={() => handleOptionChange(option)}
                  checked={selectedOption && selectedOption.id === option.id}
                  aria-label={option.value}
                />
                <label htmlFor={`${option.id}`}>{option.value}</label>
              </li>
            ))}
          </ul>
          {currentQuestionId === TOTAL_QUESTIONS ? (
            <button
              type="button"
              className="button"
              onClick={handleShowRandomMovie}
              disabled={selectedOption === null}
              aria-disabled={selectedOption === null}
            >
              Valider
            </button>
          ) : (
            <button
              type="button"
              className="button"
              onClick={handleNextQuestion}
              disabled={selectedOption === null}
              aria-disabled={selectedOption === null}
            >
              Question suivante
            </button>
          )}
        </>
      )}
    </form>
  );
}

export default Quiz;
