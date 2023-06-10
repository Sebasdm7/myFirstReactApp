function MyItem(props) {
  const activity = props.activity;
  return <li className='listItem'>{activity}</li>;
}

function MyComponent() {
  return (
    <div>
      <h1>First nested component</h1>
      <ol>
        <MyItem activity='John' />
        <MyItem activity='David' />
        <MyItem activity='Marc' />

        
      </ol>
    </div>
  );
}

export default MyComponent;
