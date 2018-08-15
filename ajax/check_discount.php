<?php

require_once('../../../config.php');
require_once('../discountlib.php');
require_once("$CFG->libdir/moodlelib.php");

global $DB;

$instanceid = $_GET['instanceid'];

$instance = $DB->get_record('enrol', array('id' => $instanceid), '*', IGNORE_MISSING);
$correct_code = ($_GET['discountcode'] == $instance->customtext2);

if($correct_code) {
    $to_return = apply_discount($instance);
    echo json_encode($to_return);
} else {
    echo json_encode(array("success" => false) );
}

?>
