<?php

require_once('../../config.php');

global $DB;

$instanceid = $_GET['instanceid'];

$instance = $DB->get_record('enrol', array('id' => $instanceid));
$correct_code = ($_GET['discountcode'] == $instance->customtext2);
error_log($correct_code);

echo json_encode(array("success" => $correct_code) );

?>
